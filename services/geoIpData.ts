
// This file handles processing IP-to-country geolocation data from a user-provided file.

interface IpRange {
    start: number;
    end: number;
    country: string;
}

let ipv4Ranges: IpRange[] | null = null;
let currentGeoIpJson: string | null = null;

function ipToInt(ip: string): number | null {
    if (typeof ip !== 'string') return null;
    const parts = ip.split('.');
    if (parts.length !== 4) return null;

    const nums = parts.map(part => parseInt(part, 10));
    if (nums.some(isNaN) || nums.some(num => num < 0 || num > 255)) {
        return null;
    }

    return nums.reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
}

export function initGeoIpData(jsonString: string): void {
    if (!jsonString || jsonString === currentGeoIpJson) {
        return; // No data to load or data is already loaded
    }

    currentGeoIpJson = jsonString; // Cache the processed content string
    ipv4Ranges = null; // Reset ranges before processing

    console.log("Processing user-provided GeoIP data...");
    const parsedJson = JSON.parse(jsonString); // Can throw SyntaxError
    
    let dataArray: any[] | null = null;

    if (Array.isArray(parsedJson)) {
        dataArray = parsedJson;
    } else if (typeof parsedJson === 'object' && parsedJson !== null) {
        // If not an array, find the first property that holds an array
        const key = Object.keys(parsedJson).find(k => Array.isArray(parsedJson[k]));
        if (key) {
            dataArray = parsedJson[key];
        }
    }

    if (!dataArray) {
        throw new Error("GeoIP JSON data is not in a recognizable format. It must be an array of objects or an object containing such an array.");
    }

    const ranges: IpRange[] = [];
    for (const item of dataArray) {
        // Handle integer-based IP ranges from user's python script
        if (item && typeof item.start === 'number' && typeof item.end === 'number' && typeof item.country === 'string') {
            ranges.push({
                start: item.start,
                end: item.end,
                country: item.country
            });
        }
        // Fallback for string-based IP ranges
        else if (item && typeof item.start === 'string' && typeof item.end === 'string' && typeof item.country === 'string') {
            const startInt = ipToInt(item.start);
            const endInt = ipToInt(item.end);
            if (startInt !== null && endInt !== null) {
                ranges.push({
                    start: startInt,
                    end: endInt,
                    country: item.country
                });
            } else {
                console.warn(`Skipping invalid IP string range in GeoIP data: start='${item.start}', end='${item.end}'`);
            }
        }
    }

    if (ranges.length === 0) {
        throw new Error("No valid IP ranges found in the provided GeoIP data file. Check format: array of objects like [{start: 'ip_string', end: 'ip_string', country: 'string'}] or [{start: number, end: number, country: 'string'}]");
    }

    ipv4Ranges = ranges.sort((a, b) => a.start - b.start);
    
    console.log(`Successfully processed ${ipv4Ranges.length} GeoIP ranges.`);
}

export function getCountryForIp(ip: string): string | null {
  if (!ipv4Ranges || ipv4Ranges.length === 0) return null;

  const ipInt = ipToInt(ip);
  if (ipInt === null) return null;
  
  // Binary search for the IP address in the sorted ranges.
  let low = 0;
  let high = ipv4Ranges.length - 1;

  while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const range = ipv4Ranges[mid];

      if (ipInt >= range.start && ipInt <= range.end) {
          return range.country;
      } else if (ipInt < range.start) {
          high = mid - 1;
      } else {
          low = mid + 1;
      }
  }

  return null;
}

// A map of country codes to their approximate geographic center coordinates.
// This provides a robust, offline fallback for geolocation visualization.
export const COUNTRY_COORDS = {
    'AF': { lat: 33.93911, lng: 67.709953 },
    'AL': { lat: 41.153332, lng: 20.168331 },
    'DZ': { lat: 28.033886, lng: 1.659626 },
    'AR': { lat: -38.416097, lng: -63.616672 },
    'AU': { lat: -25.274398, lng: 133.775136 },
    'AT': { lat: 47.516231, lng: 14.550072 },
    'BD': { lat: 23.684994, lng: 90.356331 },
    'BE': { lat: 50.503887, lng: 4.469936 },
    'BR': { lat: -14.235004, lng: -51.92528 },
    'BG': { lat: 42.733883, lng: 25.48583 },
    'CA': { lat: 56.130366, lng: -106.346771 },
    'CL': { lat: -35.675147, lng: -71.542969 },
    'CN': { lat: 35.86166, lng: 104.195397 },
    'CO': { lat: 4.570868, lng: -74.297333 },
    'CR': { lat: 9.748917, lng: -83.753428 },
    'HR': { lat: 45.1, lng: 15.2 },
    'CU': { lat: 21.521757, lng: -77.781167 },
    'CZ': { lat: 49.817492, lng: 15.472962 },
    'DK': { lat: 56.26392, lng: 9.501785 },
    'EG': { lat: 26.820553, lng: 30.802498 },
    'FI': { lat: 61.92411, lng: 25.748151 },
    'FR': { lat: 46.227638, lng: 2.213749 },
    'DE': { lat: 51.165691, lng: 10.451526 },
    'GR': { lat: 39.074208, lng: 21.824312 },
    'HU': { lat: 47.162494, lng: 19.503304 },
    'IS': { lat: 64.963051, lng: -19.020835 },
    'IN': { lat: 20.593684, lng: 78.96288 },
    'ID': { lat: -0.789275, lng: 113.921327 },
    'IR': { lat: 32.427908, lng: 53.688046 },
    'IQ': { lat: 33.223191, lng: 43.679291 },
    'IE': { lat: 53.41291, lng: -8.24389 },
    'IL': { lat: 31.046051, lng: 34.851612 },
    'IT': { lat: 41.87194, lng: 12.56738 },
    'JP': { lat: 36.204824, lng: 138.252924 },
    'JO': { lat: 30.585164, lng: 36.238414 },
    'KZ': { lat: 48.019573, lng: 66.923684 },
    'KE': { lat: -0.023559, lng: 37.906193 },
    'KW': { lat: 29.31166, lng: 47.481766 },
    'MY': { lat: 4.210484, lng: 101.975766 },
    'MX': { lat: 23.634501, lng: -102.552784 },
    'MN': { lat: 46.862496, lng: 103.846656 },
    'MA': { lat: 31.791702, lng: -7.09262 },
    'NL': { lat: 52.132633, lng: 5.291266 },
    'NZ': { lat: -40.900557, lng: 174.885971 },
    'NG': { lat: 9.081999, lng: 8.675277 },
    'KP': { lat: 40.339852, lng: 127.510093 },
    'NO': { lat: 60.472024, lng: 8.468946 },
    'OM': { lat: 21.512583, lng: 55.923255 },
    'PK': { lat: 30.375321, lng: 69.345116 },
    'PA': { lat: 8.537981, lng: -80.782127 },
    'PY': { lat: -23.442503, lng: -58.443832 },
    'PE': { lat: -9.189967, lng: -75.015152 },
    'PH': { lat: 12.879721, lng: 121.774017 },
    'PL': { lat: 51.919438, lng: 19.145136 },
    'PT': { lat: 39.399872, lng: -8.224454 },
    'QA': { lat: 25.354826, lng: 51.183884 },
    'RO': { lat: 45.943161, lng: 24.96676 },
    'RU': { lat: 61.52401, lng: 105.318756 },
    'SA': { lat: 23.885942, lng: 45.079162 },
    'SG': { lat: 1.352083, lng: 103.819836 },
    'ZA': { lat: -30.559482, lng: 22.937506 },
    'KR': { lat: 35.907757, lng: 127.766922 },
    'ES': { lat: 40.463667, lng: -3.74922 },
    'SE': { lat: 60.128161, lng: 18.643501 },
    'CH': { lat: 46.818188, lng: 8.227512 },
    'SY': { lat: 34.802075, lng: 38.996815 },
    'TW': { lat: 23.69781, lng: 120.960515 },
    'TH': { lat: 15.870032, lng: 100.992541 },
    'TR': { lat: 38.963745, lng: 35.243322 },
    'UA': { lat: 48.379433, lng: 31.16558 },
    'AE': { lat: 23.424076, lng: 53.847818 },
    'GB': { lat: 55.378051, lng: -3.435973 },
    'US': { lat: 37.09024, lng: -95.712891 },
    'UY': { lat: -32.522779, lng: -55.765835 },
    'VE': { lat: 6.42375, lng: -66.58973 },
    'VN': { lat: 14.058324, lng: 108.277199 },
    'YE': { lat: 15.552727, lng: 48.516388 },
    'ZM': { lat: -13.133897, lng: 27.849332 },
    'ZW': { lat: -19.015438, lng: 29.154857 },
};
