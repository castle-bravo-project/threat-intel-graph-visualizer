
export const SAMPLE_REPORT = {
    "Event": {
        "uuid": "14aa346e-591e-443a-82bc-123d38f3c28e",
        "info": "UMASSISLAND",
        "Attribute": [
            {
                "uuid": "4f9492de-aa2f-4d99-9781-1265b7b33840",
                "type": "domain",
                "value": "igy-americanyachtharbor.com"
            },
            {
                "uuid": "a88f493e-baa-4f1d-b048-b9207b99488c",
                "type": "domain",
                "value": "www.igy-americanyachtharbor.com"
            },
            {
                "uuid": "8d2890ef-74cd-4c44-85e4-70f51cd44026",
                "type": "ip-dst",
                "value": "99.83.188.150"
            }
        ],
        "Object": [
            {
                "uuid": "3e2b684e-18f3-4c57-84a4-554faaa33f1e",
                "name": "virustotal-report",
                "meta-category": "misc",
                "Attribute": [
                    {
                        "uuid": "7a6dded4-892e-4fb9-8d53-fde5c1d82fc2",
                        "type": "link",
                        "object_relation": "permalink",
                        "value": "https://www.virustotal.com/gui/domain/igy-americanyachtharbor.com"
                    },
                    {
                        "uuid": "82583ddf-786a-4b9a-af36-2ca15407a6dc",
                        "type": "text",
                        "object_relation": "detection-ratio",
                        "value": "0/94"
                    }
                ]
            },
            {
                "uuid": "17cc7e3d-f33b-4c12-a4d4-66e4b9c55ec2",
                "name": "domain-ip",
                "meta-category": "network",
                "Attribute": [
                    {
                        "uuid": "6f202c0d-8972-4e04-835c-7f49881460ea",
                        "type": "domain",
                        "value": "igy-americanyachtharbor.com",
                        "object_relation": "domain"
                    }
                ],
                "ObjectReference": [
                    {
                        "uuid": "7a13772b-697d-444b-a497-776b1e0a8446",
                        "object_uuid": "17cc7e3d-f33b-4c12-a4d4-66e4b9c55ec2",
                        "referenced_uuid": "3e2b684e-18f3-4c57-84a4-554faaa33f1e",
                        "relationship_type": "analysed-with"
                    },
                    {
                        "uuid": "2408fe94-1937-40c8-a628-dfc1f0523991",
                        "object_uuid": "17cc7e3d-f33b-4c12-a4d4-66e4b9c55ec2",
                        "referenced_uuid": "3c0dd813-0adf-425c-bb7b-9ec498dd9b51",
                        "relationship_type": "resolves-to"
                    }
                ]
            },
            {
                "uuid": "3c0dd813-0adf-425c-bb7b-9ec498dd9b51",
                "name": "domain-ip",
                "meta-category": "network",
                "Attribute": [
                    {
                        "uuid": "36285359-891c-4693-87d5-592da832c1ae",
                        "type": "ip-dst",
                        "value": "99.83.188.150",
                        "object_relation": "ip-dst"
                    }
                ],
                "ObjectReference": [
                     {
                        "uuid": "482fece4-bb93-456e-ae44-a9395336b1e7",
                        "object_uuid": "3c0dd813-0adf-425c-bb7b-9ec498dd9b51",
                        "referenced_uuid": "88e81f08-84a7-4f22-af4c-9be4481574e2",
                        "relationship_type": "communicates-with"
                    }
                ]
            },
            {
                "uuid": "88e81f08-84a7-4f22-af4c-9be4481574e2",
                "name": "file",
                "meta-category": "file",
                "Attribute": [
                    {
                        "uuid": "7a6d8260-e07b-4153-9da7-e84cf17d0025",
                        "type": "sha256",
                        "value": "03ad40c7560157096b8986fb65b4747caadef75b55e7d5384092318e390e2e2a",
                        "object_relation": "sha256"
                    }
                ]
            }
        ]
    }
};
