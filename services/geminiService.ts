

import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { GraphData, Node, Link, AttackMatrixData, Cluster, ClusteringResolution, EnrichmentData, SandboxAnalysisResult, AsnInfo } from '../types';

// API Key Management
let currentApiKey: string | null = null;
let ai: GoogleGenAI | null = null;

export type ApiKeyStatus = 'missing' | 'user-provided' | 'environment' | 'invalid';

// Initialize with environment variable if available
const envApiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
if (envApiKey) {
  currentApiKey = envApiKey;
  ai = new GoogleGenAI({ apiKey: envApiKey });
}

/**
 * Set a user-provided API key and reinitialize the AI client
 */
export function setUserApiKey(apiKey: string): void {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key cannot be empty');
  }

  const trimmedKey = apiKey.trim();
  currentApiKey = trimmedKey;
  ai = new GoogleGenAI({ apiKey: trimmedKey });

  // Store in localStorage for persistence
  try {
    localStorage.setItem('gemini_api_key', trimmedKey);
  } catch (error) {
    console.warn('Failed to store API key in localStorage:', error);
  }
}

/**
 * Clear user-provided API key and revert to environment variable if available
 */
export function clearUserApiKey(): void {
  try {
    localStorage.removeItem('gemini_api_key');
  } catch (error) {
    console.warn('Failed to remove API key from localStorage:', error);
  }

  // Revert to environment variable if available
  if (envApiKey) {
    currentApiKey = envApiKey;
    ai = new GoogleGenAI({ apiKey: envApiKey });
  } else {
    currentApiKey = null;
    ai = null;
  }
}

/**
 * Get the current API key status
 */
export function getApiKeyStatus(): { status: ApiKeyStatus; hasKey: boolean } {
  // Check for user-provided key first
  try {
    const userKey = localStorage.getItem('gemini_api_key');
    if (userKey && userKey.trim() !== '') {
      currentApiKey = userKey;
      if (!ai) {
        ai = new GoogleGenAI({ apiKey: userKey });
      }
      return { status: 'user-provided', hasKey: true };
    }
  } catch (error) {
    console.warn('Failed to read API key from localStorage:', error);
  }

  // Check environment variable
  if (envApiKey) {
    return { status: 'environment', hasKey: true };
  }

  return { status: 'missing', hasKey: false };
}

/**
 * Check if AI services are available
 */
export function isAiAvailable(): boolean {
  const { hasKey } = getApiKeyStatus();
  return hasKey && ai !== null;
}

/**
 * Get a demo/fallback response for when AI is not available
 */
function getDemoResponse(context: string): any {
  const demoResponses = {
    analysis: {
      analysis: "This is a demo analysis. To get real AI-powered threat intelligence analysis, please add your Google Gemini API key using the banner above. The AI would normally analyze the threat landscape, assess risk levels, and provide actionable recommendations based on the indicators in your report.",
      keyIndicatorIds: []
    },
    attack: [],
    clustering: [],
    narrative: "This is a demo path narrative. With a valid API key, the AI would provide detailed analysis of how an attacker might move between these indicators.",
    yara: "/* Demo YARA Rule - Add your API key for AI-generated rules */\nrule Demo_Threat_Rule {\n    meta:\n        description = \"Demo rule - requires API key for real generation\"\n        author = \"Castle Bravo Project - Demo Mode\"\n    strings:\n        $demo = \"Add API key for real YARA generation\"\n    condition:\n        $demo\n}",
    mermaid: "graph TD\n    A[\"Demo Mode\"] --> B[\"Add API Key\"]\n    B --> C[\"Get Real AI Analysis\"]",
    recommendations: "## Demo Recommendations\n\n**To unlock full AI capabilities:**\n- Add your Google Gemini API key using the banner above\n- Get real-time threat intelligence analysis\n- Generate custom YARA rules and attack narratives\n\n**Current Demo Features:**\n- Static visualization of threat data\n- Interactive graph exploration\n- Geographic mapping of IP addresses",
    enrichment: {
      summary: "Demo enrichment data. Add your API key to get real threat intelligence enrichment from AI analysis."
    },
    asn: {}
  };

  return demoResponses[context as keyof typeof demoResponses] || null;
}

/**
 * Wrapper function to handle AI calls with fallback to demo mode
 */
async function callAiWithFallback<T>(
  aiFunction: () => Promise<T>,
  context: string,
  fallbackData?: T
): Promise<T> {
  if (!isAiAvailable()) {
    const demoData = fallbackData || getDemoResponse(context);
    if (demoData !== null) {
      return demoData as T;
    }
    throw new Error(`AI services are not available. Please add your Google Gemini API key to enable ${context}.`);
  }

  try {
    return await aiFunction();
  } catch (error: any) {
    if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
      throw new Error('The provided API key is invalid. Please check your Google Gemini API key.');
    }
    throw error;
  }
}

/**
 * Extracts a JSON object or array from a string, stripping any leading/trailing text or markdown.
 * @param text The raw string response from the AI.
 * @returns A string containing only the JSON part of the input.
 */
function extractJsonFromString(text: string): string {
  if (!text) return "";
  
  const firstBracket = text.indexOf('{');
  const firstSquare = text.indexOf('[');
  
  let start = -1;

  if (firstBracket === -1 && firstSquare === -1) {
    return ""; // No JSON object or array found
  }
  
  if (firstBracket === -1) {
    start = firstSquare;
  } else if (firstSquare === -1) {
    start = firstBracket;
  } else {
    start = Math.min(firstBracket, firstSquare);
  }
  
  const lastBracket = text.lastIndexOf('}');
  const lastSquare = text.lastIndexOf(']');
  
  const end = Math.max(lastBracket, lastSquare);

  if (end === -1 || end < start) {
    return ""; // No valid closing bracket/square found
  }
  
  return text.substring(start, end + 1);
}

interface AnalysisResponse {
  analysis: string;
  keyIndicatorIds: string[];
}

export async function analyzeGraphWithGemini(graphData: GraphData): Promise<AnalysisResponse> {
  return callAiWithFallback(async () => {
    if (!ai) {
      throw new Error('AI client not initialized');
    }

    const { nodes, links } = graphData;

    const mainNode = nodes.find(n => n.type === 'main');
    if (!mainNode) {
      throw new Error('Main event node not found in the graph data.');
    }

    const nodeDescriptions = nodes
      .map(n => `- Label: "${n.label}" (Type: ${n.type}, ID: ${n.id})`)
      .join('\n');

    const linkDescriptions = links.map(l => {
        const sourceNode = nodes.find(n => n.id === (typeof l.source === 'string' ? l.source : (l.source as Node).id));
        const targetNode = nodes.find(n => n.id === (typeof l.target === 'string' ? l.target : (l.target as Node).id));
        if (sourceNode && targetNode) {
            return `- "${sourceNode.label}" (Type: ${sourceNode.type}) is linked to "${targetNode.label}" (Type: ${targetNode.type})`;
        }
        return '';
    }).filter(Boolean).join('\n');

    const prompt = `
You are a senior cybersecurity analyst. Your task is to analyze a graph of indicators from a MISP (Malware Information Sharing Platform) threat intelligence report and provide a concise, expert summary in JSON format.

The main event is: "${mainNode.label}"

The graph contains the following indicators (nodes):
${nodeDescriptions}

The observed relationships (links) are:
${linkDescriptions}

Based on this graph, your response MUST be a JSON object that adheres to the provided schema.

The JSON object must contain:
1.  "analysis": A string containing a concise, expert summary covering:
    - A brief summary of the threat landscape (the story told by the relationships).
    - An assessment of the potential threat level (e.g., Low, Medium, High, Critical) with justification.
    - Recommended actions for a security operations team.
2.  "keyIndicatorIds": An array of strings. Each string must be the ID of a key indicator of compromise (IOC) from the list of nodes provided above. Select the most critical and relevant nodes that form the core of the attack narrative. The order of IDs in the array should ideally represent the attack flow, if discernible.

Do not include any other text or formatting outside of the main JSON object.
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        analysis: {
          type: Type.STRING,
          description: "Expert analysis of the threat landscape, potential threat level, and recommended actions."
        },
        keyIndicatorIds: {
          type: Type.ARRAY,
          description: "An array of node IDs representing the key indicators of compromise, ordered to show the attack flow if possible.",
          items: {
            type: Type.STRING,
            description: "The UUID of a node from the graph."
          }
        }
      },
      required: ["analysis", "keyIndicatorIds"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const rawText = response.text;
    if (!rawText) {
        console.error('Gemini API returned an empty response for analysis.', response);
        throw new Error('The AI service returned an empty response.');
    }

    const jsonText = extractJsonFromString(rawText);
    if (!jsonText) {
        console.error("Could not extract JSON from Gemini response for analysis", rawText);
        throw new Error("AI returned a response, but it did not contain valid JSON.");
    }

    return JSON.parse(jsonText) as AnalysisResponse;
  }, 'analysis');
}


export async function mapToAttckWithGemini(graphData: GraphData): Promise<AttackMatrixData> {
  return callAiWithFallback(async () => {
    if (!ai) {
      throw new Error('AI client not initialized');
    }

    const { nodes, links } = graphData;

    const nodeDescriptions = nodes
      .map(n => `- Label: "${n.label}" (Type: ${n.type}, ID: ${n.id})`)
      .join('\n');

    const linkDescriptions = links.map(l => {
        const sourceNode = nodes.find(n => n.id === (typeof l.source === 'string' ? l.source : (l.source as Node).id));
        const targetNode = nodes.find(n => n.id === (typeof l.target === 'string' ? l.target : (l.target as Node).id));
        if (sourceNode && targetNode) {
            return `- Relationship: "${sourceNode.label}" (${sourceNode.type}) -> "${targetNode.label}" (${targetNode.type})`;
        }
        return '';
    }).filter(Boolean).join('\n');

    const prompt = `
You are an expert cybersecurity analyst specializing in threat intelligence and the MITRE ATT&CK Framework.
Analyze the following graph of indicators of compromise (IOCs) from a threat report. Your task is to map the observed indicators and their relationships to the corresponding MITRE ATT&CK Enterprise tactics and techniques.

**Indicators (Nodes):**
${nodeDescriptions}

**Relationships (Links):**
${linkDescriptions}

**Instructions:**
Based on the provided data, identify all relevant ATT&CK tactics and the specific techniques used within those tactics.
For each technique you identify, provide:
1.  A very brief (1-2 sentences) justification explaining why the data supports this technique.
2.  A list of the specific indicator IDs that are evidence for this technique.

Your response MUST be a JSON object that adheres to the provided schema. The output should be an array of tactic objects. Only include tactics for which you can identify at least one technique.

Do not include any explanatory text outside of the final JSON object.
`;

    const schema = {
        type: Type.ARRAY,
        description: "A list of MITRE ATT&CK tactics identified from the threat data.",
        items: {
            type: Type.OBJECT,
            properties: {
                tacticId: { type: Type.STRING, description: "The Tactic ID, e.g., 'TA0001'." },
                tacticName: { type: Type.STRING, description: "The Tactic Name, e.g., 'Initial Access'." },
                techniques: {
                    type: Type.ARRAY,
                    description: "A list of techniques identified within this tactic.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            techniqueId: { type: Type.STRING, description: "The Technique ID, e.g., 'T1566'." },
                            techniqueName: { type: Type.STRING, description: "The Technique Name, e.g., 'Phishing'." },
                            justification: { type: Type.STRING, description: "Explanation of why this technique was identified from the data." },
                            indicatorIds: {
                                type: Type.ARRAY,
                                description: "List of node IDs that provide evidence for this technique.",
                                items: { type: Type.STRING }
                            }
                        },
                        required: ["techniqueId", "techniqueName", "justification", "indicatorIds"]
                    }
                }
            },
            required: ["tacticId", "tacticName", "techniques"]
        }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens: 8192,
      }
    });

    const rawText = response.text;
    if (!rawText) {
        console.error('Gemini API returned an empty response for ATT&CK mapping.', response);
        throw new Error('The AI service returned an empty response.');
    }

    const jsonText = extractJsonFromString(rawText);
    if (!jsonText) {
        console.error("Could not extract JSON from Gemini response for ATT&CK mapping", rawText);
        throw new Error("AI returned a response, but it did not contain valid JSON.");
    }

    const parsedResponse = JSON.parse(jsonText);

    if (Array.isArray(parsedResponse)) {
        return parsedResponse as AttackMatrixData;
    }

    if (typeof parsedResponse === 'object' && parsedResponse !== null) {
        const key = Object.keys(parsedResponse).find(k => Array.isArray(parsedResponse[k]));
        if (key) {
            return parsedResponse[key] as AttackMatrixData;
        }
    }

    throw new Error("Response was not in the expected format (array of tactics).");
  }, 'attack');
}

export async function generatePathNarrative(pathNodes: Node[], startNode: Node, endNode: Node): Promise<string> {
  return callAiWithFallback(async () => {
    if (!ai) {
      throw new Error('AI client not initialized');
    }

    const pathDescription = pathNodes.map(n => `- ${n.type}: ${n.label}`).join('\n');

    const prompt = `
You are a cybersecurity analyst delivering a threat briefing.
Your task is to explain the relationship between two specific indicators of compromise.

The starting indicator is a ${startNode.type}: "${startNode.label}".
The ending indicator is a ${endNode.type}: "${endNode.label}".

The path connecting them is as follows:
${pathDescription}

Provide a concise, step-by-step narrative explaining how an attacker could move from the start to the end indicator, using the provided path as the sequence of events. Explain the role of each indicator in the chain. Keep it brief and to the point.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.4
        }
    });
    return response.text;
  }, 'narrative');
}

export async function clusterGraphWithGemini(graphData: GraphData, resolution: ClusteringResolution = 'default'): Promise<Cluster[]> {
  return callAiWithFallback(async () => {
    if (!ai) {
      throw new Error('AI client not initialized');
    }

    const { nodes, links } = graphData;

    const nodeDescriptions = nodes
      .map(n => `- Label: "${n.label}" (Type: ${n.type}, ID: ${n.id})`)
      .join('\n');

    const linkDescriptions = links.map(l => {
        const sourceNode = nodes.find(n => n.id === (typeof l.source === 'string' ? l.source : (l.source as Node).id));
        const targetNode = nodes.find(n => n.id === (typeof l.target === 'string' ? l.target : (l.target as Node).id));
        if (sourceNode && targetNode) {
            return `- Relationship: "${sourceNode.label}" (${sourceNode.type}) -> "${targetNode.label}" (${targetNode.type})`;
        }
        return '';
    }).filter(Boolean).join('\n');

    const basePrompt = `
You are a cybersecurity analyst tasked with identifying distinct activity groups from a graph of threat intelligence data.
Analyze the provided nodes and their relationships to group them into logical clusters. Your response MUST be a JSON object that is an array of clusters, conforming to the provided schema.

**Indicators (Nodes):**
${nodeDescriptions}

**Relationships (Links):**
${linkDescriptions}
`;

    const prompts: Record<ClusteringResolution, string> = {
      'coarse': `
${basePrompt}
**Instructions:**
Your task is to identify only a few (2-4) high-level, distinct activity groups.
- Group nodes into very broad functional clusters (e.g., 'Initial Compromise', 'C2 Infrastructure', 'Data Staging').
- Only create clusters for the most obvious and strongly connected groups of nodes.
- It is okay to leave many nodes uncategorized. Focus on the big picture.
- Do not include any explanatory text outside of the final JSON object.
      `,
      'default': `
${basePrompt}
**Instructions:**
Your response MUST be a JSON object that is an array of clusters, conforming to the provided schema.
- Each cluster object must contain a 'title' (a short, descriptive name) and 'nodeIds' (an array of node IDs belonging to the cluster).
- Group nodes that are strongly related or share a common function (e.g., a group of related IPs and domains might form a "C2 Infrastructure" cluster).
- It is NOT required to include every node. Focus on creating meaningful groups. A node should not be in more than one group.
- Do not include any explanatory text outside of the final JSON object.
      `,
      'fine': `
${basePrompt}
**Instructions:**
Your task is to organize ALL provided nodes into logical clusters.
- Group nodes into specific functional clusters (e.g., "Phishing Domain", "Malware Dropper", "Exfiltration IP").
- Every node provided MUST be assigned to exactly one cluster.
- If a node doesn't fit a specific group, create a 'Miscellaneous' or 'General' cluster for it.
- Your response MUST be a JSON object that is an array of clusters, conforming to the provided schema.
- Do not include any explanatory text outside of the final JSON object.
      `
    };

    const prompt = prompts[resolution];

    const schema = {
      type: Type.ARRAY,
      description: "An array of logical node clusters.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "A short, descriptive title for the cluster."
          },
          nodeIds: {
            type: Type.ARRAY,
            description: "An array of node IDs belonging to this cluster.",
            items: {
              type: Type.STRING
            }
          }
        },
        required: ["title", "nodeIds"]
      }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const rawText = response.text;
    if (!rawText) {
        console.error('Gemini API returned an empty response for clustering.', response);
        throw new Error('The AI service returned an empty response.');
    }

    const jsonText = extractJsonFromString(rawText);
    if (!jsonText) {
        console.error("Could not extract JSON from Gemini response for clustering", rawText);
        throw new Error("AI returned a response, but it did not contain valid JSON.");
    }

    const parsedResponse = JSON.parse(jsonText);
    if (Array.isArray(parsedResponse)) {
        return parsedResponse as Cluster[];
    }
    // Handle cases where the model might wrap the array in an object
    if (typeof parsedResponse === 'object' && parsedResponse !== null) {
        const key = Object.keys(parsedResponse).find(k => Array.isArray(parsedResponse[k]));
        if (key) {
            return parsedResponse[key] as Cluster[];
        }
    }
    throw new Error("Response was not in the expected format (array of clusters).");
  }, 'clustering');
}

export async function generateYaraRules(graphData: GraphData): Promise<string> {
  return callAiWithFallback(async () => {
    if (!ai) {
      throw new Error('AI client not initialized');
    }

    const fileNodes = graphData.nodes.filter(n =>
      n.type === 'file' && (n.label.includes('.') || n.label.length === 32 || n.label.length === 40 || n.label.length === 64)
    );

    if (fileNodes.length === 0) {
      return "/* No file-based indicators (filenames, hashes) suitable for YARA rule generation were found in this report. */";
    }

    const indicatorDescriptions = fileNodes.map((node, index) => {
      const isHash = !node.label.includes('.') && (node.label.length === 32 || node.label.length === 40 || node.label.length === 64);
      return `- Indicator ${index + 1}: ${isHash ? 'File Hash' : 'Filename'}: ${node.label}`;
    }).join('\n');

    const currentDate = new Date().toISOString().split('T')[0];

    const prompt = `
You are a cybersecurity expert specializing in threat detection and malware analysis.
Your task is to generate a YARA rule to detect the threats described by the following file-based indicators of compromise.

**Indicators:**
${indicatorDescriptions}

**Instructions:**
1.  Create a single, well-structured YARA rule named "Threat_Intel_Report_Rule".
2.  In the 'meta' section, include a description summarizing what the rule detects, an author "Castle Bravo Project - Threat Intel Visualizer AI", and the date "${currentDate}".
3.  In the 'strings' section, create signatures based on the provided filenames and hashes. Use appropriate modifiers (e.g., 'nocase', 'ascii', 'wide'). For hashes, create a condition to match against standard pe hash types (md5, sha1, sha256).
4.  In the 'condition' section, write logic to trigger the rule. If multiple hashes are present, use an 'any of them' condition. If filenames are present, you might use 'any of them' as well.
5.  The output must be only the YARA rule code, enclosed in a single markdown code block. Do not include any other text or explanation.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.1
        }
    });

    let text = response.text;
    text = text.replace(/^```yara\s*/, '');
    text = text.replace(/^```\s*/, '');
    text = text.replace(/```$/, '');
    return text.trim();
  }, 'yara');
}


export async function generateMermaidGraph(threatData: GraphData): Promise<string> {
  return callAiWithFallback(async () => {
    if (!ai) {
      throw new Error('AI client not initialized');
    }

    if (!threatData || threatData.nodes.length === 0) {
      return "graph TD\n    A[No threat data available];";
    }

    const nodeDescriptions = threatData.nodes.map((node, index) => {
      return `- Node ${index}: Type - ${node.type}, Label - ${node.label}`;
    }).join('\n');

    const prompt = `
You are a cybersecurity analyst creating a visual report.
Based on the following sequence of key threat indicators, generate a Mermaid.js flowchart diagram (graph TD).

Indicators (in order of attack flow):
${nodeDescriptions}

Instructions:
1. The graph MUST be a top-down flowchart ('graph TD').
2. Each node from the list should be a node in the graph. Use a unique ID for each node (e.g., N0, N1, N2).
3. The node text should be in the format: "Type<br/><b>Label</b>". For example: N0["domain<br/><b>malicious.com</b>"]. Use a <br/> tag for the line break.
4. Link the nodes sequentially: N0 --> N1 --> N2 etc.
5. The final output must be ONLY the Mermaid syntax, enclosed in a single markdown code block. Do not include any other text or explanation.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.1
        }
    });

    let text = response.text;
    text = text.replace(/^```mermaid\s*/, '');
    text = text.replace(/^```\s*/, '');
    text = text.replace(/```$/, '');
    return text.trim();
  }, 'mermaid');
}

// Helper function to convert File to base64
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string; } }> {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type
    }
  };
}

export async function analyzeSandboxPdfWithGemini(pdfFile: File): Promise<SandboxAnalysisResult> {
  return callAiWithFallback(async () => {
    if (!ai) {
      throw new Error('AI client not initialized');
    }

    const filePart = await fileToGenerativePart(pdfFile);

    const prompt = `
You are an expert security analyst specializing in malware analysis and sandbox reports.
Your task is to meticulously analyze the provided PDF, which is a sandbox analysis report for a malicious file, and extract specific indicators of compromise (IOCs).

Your process MUST be:
1.  First, locate the primary file hash (SHA256, SHA1, or MD5) of the analyzed sample. This is the most critical piece of information.
2.  Second, based on the identified sample, extract its behavioral data from the report.

The JSON output MUST be your ONLY response and it MUST strictly adhere to the provided schema.

Your JSON response must include:
1.  "file_hash": A string for the primary file hash of the analyzed sample.
2.  "processes_created": An array of strings, where each string is a process name or command line executed by the sample.
3.  "files_dropped": An array of strings, listing the full paths or filenames of files created/dropped by the sample.
4.  "registry_keys_modified": An array of strings, listing the full paths of registry keys that were created or modified.

It is absolutely critical that you return all four keys ("file_hash", "processes_created", "files_dropped", "registry_keys_modified") in your JSON response. If you cannot find information for a key, its value MUST be an empty array [] for array types or an empty string "" for the "file_hash" string type. DO NOT omit any keys from the final JSON object. Do not include any text, markdown, or explanation outside of the JSON object.
`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        file_hash: {
          type: Type.STRING,
          description: "The primary file hash (SHA256, MD5, etc.) of the analyzed file."
        },
        processes_created: {
          type: Type.ARRAY,
          description: "List of new process names or command lines executed.",
          items: { type: Type.STRING }
        },
        files_dropped: {
          type: Type.ARRAY,
          description: "List of file paths or names dropped by the malware.",
          items: { type: Type.STRING }
        },
        registry_keys_modified: {
          type: Type.ARRAY,
          description: "List of registry keys that were created or modified.",
          items: { type: Type.STRING }
        }
      },
      required: ["file_hash", "processes_created", "files_dropped", "registry_keys_modified"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [filePart, { text: prompt }] },
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const rawText = response.text;
    if (!rawText) {
        throw new Error('The AI service returned an empty response for sandbox analysis.');
    }
    const jsonText = extractJsonFromString(rawText);
    if (!jsonText) {
      throw new Error("AI returned a response for sandbox analysis, but it did not contain valid JSON.");
    }
    return JSON.parse(jsonText);
  }, 'sandbox', {
    file_hash: "",
    processes_created: [],
    files_dropped: [],
    registry_keys_modified: []
  });
}

export async function enrichIndicatorWithGemini(node: Node): Promise<EnrichmentData> {
  return callAiWithFallback(async () => {
    if (!ai) {
      throw new Error('AI client not initialized');
    }

    const basePrompt = `
You are a threat intelligence enrichment API simulator. Your task is to provide a detailed, realistic JSON response for the given indicator of compromise. The response should mimic data aggregated from multiple services like VirusTotal, AbuseIPDB, Shodan, and WHOIS.
The response MUST be only a valid JSON object adhering to the specified schema for the indicator type. Do not include markdown or any other text.

**Indicator to Enrich:**
- Type: ${node.type}
- Value: ${node.label}
`;

    let specificPrompt: string;
    let schema: any;

    switch (node.type) {
      case 'ip':
        schema = {
          type: Type.OBJECT,
          properties: {
            reputation_score: { type: Type.INTEGER, description: "Abuse confidence score (0-100)." },
            isp: { type: Type.STRING, description: "Internet Service Provider." },
            usage_type: { type: Type.STRING, description: "e.g., 'Data Center/Web Hosting/Transit', 'Commercial', 'Residential'." },
            country: { type: Type.STRING, description: "Two-letter country code." },
            abuse_reports: { type: Type.INTEGER, description: "Total number of abuse reports." },
            last_report_date: { type: Type.STRING, description: "Date of the last abuse report (YYYY-MM-DD)." },
            summary: { type: Type.STRING, description: "A brief summary of recent malicious activity associated with this IP." },
          },
          required: ["reputation_score", "isp", "usage_type", "country", "abuse_reports", "last_report_date", "summary"]
        };
        specificPrompt = `${basePrompt}\n**Required Schema (IP Address):**\nProvide a realistic JSON response based on the schema.`;
        break;
      case 'domain':
        schema = {
          type: Type.OBJECT,
          properties: {
            registrar: { type: Type.STRING, description: "The domain registrar, e.g., 'NameCheap', 'GoDaddy'." },
            creation_date: { type: Type.STRING, description: "Domain creation date (YYYY-MM-DD)." },
            vt_detection_ratio: { type: Type.STRING, description: "VirusTotal detection ratio, e.g., '5/90'." },
            reputation: { type: Type.STRING, description: "Reputation summary, e.g., 'Malicious', 'Suspicious', 'Clean'." },
            ssl_certificate: {
              type: Type.OBJECT,
              properties: {
                common_name: { type: Type.STRING, description: "The Common Name (CN) from the SSL certificate." },
                issuer: { type: Type.STRING, description: "The issuer of the SSL certificate, e.g., 'Let's Encrypt', 'Sectigo'." },
              },
              required: ["common_name", "issuer"],
            },
            summary: { type: Type.STRING, description: "A brief summary of why this domain is considered suspicious or malicious, taking into account its age and SSL info." },
          },
          required: ["registrar", "creation_date", "vt_detection_ratio", "reputation", "ssl_certificate", "summary"]
        };
        specificPrompt = `${basePrompt}\n**Required Schema (Domain):**\nProvide a realistic JSON response based on the schema. If the domain appears to be part of a phishing attempt (e.g., 'login-microsft.com'), create an SSL common name that impersonates a legitimate brand (e.g., 'login.microsoft.com') to simulate a mismatch.`;
        break;
      case 'file':
        schema = {
          type: Type.OBJECT,
          properties: {
            vt_detection_ratio: { type: Type.STRING, description: "VirusTotal detection ratio, e.g., '62/75'." },
            first_seen: { type: Type.STRING, description: "First seen in the wild date (YYYY-MM-DD)." },
            malware_families: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Common malware family names associated with this hash." },
            summary: { type: Type.STRING, description: "A brief summary of the malware's behavior and purpose." },
          },
          required: ["vt_detection_ratio", "first_seen", "malware_families", "summary"]
        };
        specificPrompt = `${basePrompt}\n**Required Schema (File Hash):**\nProvide a realistic JSON response based on the schema.`;
        break;
      default:
        throw new Error(`Enrichment for node type "${node.type}" is not supported.`);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: specificPrompt,
      config: {
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const rawText = response.text;
    if (!rawText) {
        throw new Error('The AI enrichment service returned an empty response.');
    }

    const jsonText = extractJsonFromString(rawText);
    if (!jsonText) {
      throw new Error("AI returned a response for enrichment, but it did not contain valid JSON.");
    }
    return JSON.parse(jsonText);
  }, 'enrichment');
}

export async function fetchAsnInfoForIps(ips: string[]): Promise<Record<string, AsnInfo>> {
    if (ips.length === 0) {
        return {};
    }

    return callAiWithFallback(async () => {
        if (!ai) {
            throw new Error('AI client not initialized');
        }

        // Process IPs in smaller chunks to avoid issues with large responses.
        const CHUNK_SIZE = 100;
        const ipChunks: string[][] = [];
        for (let i = 0; i < ips.length; i += CHUNK_SIZE) {
            ipChunks.push(ips.slice(i, i + CHUNK_SIZE));
        }

        const resultMap: Record<string, AsnInfo> = {};

        const schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    ip_address: {
                        type: Type.STRING,
                        description: "The IP address from the list."
                    },
                    asn: {
                        type: Type.OBJECT,
                        properties: {
                            number: {
                                type: Type.STRING,
                                description: "The AS number, e.g., '14061'."
                            },
                            name: {
                                type: Type.STRING,
                                description: "The AS name, e.g., 'DIGITALOCEAN-ASN'."
                            }
                        },
                        required: ["number", "name"]
                    }
                },
                required: ["ip_address", "asn"]
            }
        };

        // Process each chunk of IPs separately to improve reliability.
        for (const [index, chunk] of ipChunks.entries()) {
            const prompt = `
You are an IP intelligence service. For the given list of IP addresses, return their Autonomous System (AS) number and AS name.
Your response MUST be a JSON array of objects. Each object should represent an IP address and contain its corresponding ASN details.
Follow the provided schema precisely. Ensure each JSON object in the array is separated by a comma. Do not include any text outside the JSON array.

**IP List:**
${chunk.join('\n')}
`;
            // Add a delay between API calls to avoid hitting rate limits.
            // No need to delay before the very first call.
            if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 1100)); // A bit over 1s to be safe
            }

            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        temperature: 0.1,
                        responseMimeType: "application/json",
                        responseSchema: schema
                    }
                });

                const rawText = response.text;
                if (!rawText) {
                    console.warn('The ASN lookup service returned an empty response for a chunk.');
                    continue;
                }

                const jsonText = extractJsonFromString(rawText);
                if (!jsonText) {
                    console.warn("AI returned a response for an ASN lookup chunk, but it did not contain valid JSON.");
                    continue;
                }

                const responseArray: { ip_address: string; asn: AsnInfo }[] = JSON.parse(jsonText);
                for (const item of responseArray) {
                    if (item.ip_address && item.asn) {
                        resultMap[item.ip_address] = item.asn;
                    }
                }

            } catch (error: any) {
                // Log the error for the specific chunk but continue processing other chunks.
                console.error(`Error calling Gemini API for an ASN lookup chunk:`, error);
            }
        }

        return resultMap;
    }, 'asn', {});
}

export async function generateRecommendations(graphData: GraphData, analysis: string): Promise<string> {
  return callAiWithFallback(async () => {
    if (!ai) {
      throw new Error('AI client not initialized');
    }

    const nodeSummary = graphData.nodes.slice(0, 15).map(n => `- ${n.type}: ${n.label}`).join('\n'); // Summary of first 15 nodes

    const prompt = `
You are a senior cybersecurity incident response manager providing guidance to an analyst.
Based on the provided initial AI analysis and a summary of the threat indicators, your task is to generate a list of specific, actionable recommendations for the next steps in the investigation.

**Initial AI Analysis:**
${analysis}

**Key Indicators Summary:**
${nodeSummary}

**Instructions:**
Provide a concise, bulleted list of recommendations. Categorize them into logical areas like:
- **Network Forensics:** (e.g., "Review firewall logs for traffic to/from IP 1.2.3.4", "Block domain evil.com at the DNS level").
- **Host-Based Analysis:** (e.g., "Search for file hash abc... on all endpoints", "Examine process execution logs for powershell.exe on affected systems").
- **Intelligence & Threat Hunting:** (e.g., "Search for related domains using the SSL certificate serial number", "Pivot on the ASN to find other malicious infrastructure").

The recommendations should be practical and directly related to the provided data. The goal is to guide a human analyst on what to do next to fully understand and contain this threat.
The output MUST be a single string of markdown-formatted text. Do not use JSON.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.5,
      }
    });
    return response.text;
  }, 'recommendations');
}