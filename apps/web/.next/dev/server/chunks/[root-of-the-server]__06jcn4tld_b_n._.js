module.exports = [
(()=>{"use strict";return[
"[project]/apps/agent-runtime/src/extractors/llm-extractor.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_SYSTEM_PROMPT",
    ()=>DEFAULT_SYSTEM_PROMPT,
    "LLM_DRAFT_SCHEMA",
    ()=>LLM_DRAFT_SCHEMA,
    "createLlmProfileExtractor",
    ()=>createLlmProfileExtractor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$validators$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/validators.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$pii$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/pii.ts [app-route] (ecmascript)");
;
;
const LLM_DRAFT_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        locale: {
            type: 'string'
        },
        target_roles: {
            type: 'array',
            items: {
                type: 'string'
            }
        },
        skills: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'original_term'
                ],
                properties: {
                    original_term: {
                        type: 'string'
                    },
                    canonical_hint: {
                        type: 'string'
                    },
                    kind_hint: {
                        enum: [
                            'technical',
                            'soft'
                        ]
                    },
                    level_hint: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 4
                    },
                    confidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1
                    },
                    evidence: {
                        type: 'array',
                        items: {
                            $ref: '#/$defs/evidence'
                        }
                    }
                }
            }
        },
        experiences: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'experience_type',
                    'title',
                    'description'
                ],
                properties: {
                    experience_type: {
                        enum: [
                            'formal_employment',
                            'informal_work',
                            'family_business',
                            'volunteering',
                            'project',
                            'academic',
                            'internship'
                        ]
                    },
                    title: {
                        type: 'string'
                    },
                    organization: {
                        type: 'string'
                    },
                    description: {
                        type: 'string'
                    },
                    confidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1
                    },
                    evidence: {
                        type: 'array',
                        items: {
                            $ref: '#/$defs/evidence'
                        }
                    }
                }
            }
        },
        education: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'institution',
                    'program'
                ],
                properties: {
                    institution: {
                        type: 'string'
                    },
                    program: {
                        type: 'string'
                    },
                    level: {
                        enum: [
                            'primary',
                            'secondary',
                            'technical',
                            'undergraduate',
                            'postgraduate',
                            'course',
                            'other'
                        ]
                    },
                    evidence: {
                        type: 'array',
                        items: {
                            $ref: '#/$defs/evidence'
                        }
                    }
                }
            }
        },
        certifications: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'name'
                ],
                properties: {
                    name: {
                        type: 'string'
                    },
                    issuer: {
                        type: 'string'
                    },
                    evidence: {
                        type: 'array',
                        items: {
                            $ref: '#/$defs/evidence'
                        }
                    }
                }
            }
        },
        notes: {
            type: 'array',
            items: {
                type: 'string'
            }
        }
    },
    $defs: {
        evidence: {
            type: 'object',
            additionalProperties: false,
            required: [
                'claim',
                'source'
            ],
            properties: {
                claim: {
                    type: 'string'
                },
                source: {
                    enum: [
                        'declared',
                        'extracted',
                        'verified',
                        'inferred'
                    ]
                },
                source_ref: {
                    type: 'string'
                },
                excerpt: {
                    type: 'string'
                },
                confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1
                }
            }
        }
    }
};
const DEFAULT_SYSTEM_PROMPT = [
    'Eres el Agente de Perfil y Evidencia de Puente Laboral Panamá.',
    'Extraes experiencia formal e informal, proyectos, negocio familiar, voluntariado y trabajo académico,',
    'además de habilidades técnicas y blandas, desde el texto de un CV o una descripción.',
    'Reglas estrictas:',
    '- Conserva siempre el término original del candidato en `original_term`.',
    '- Una habilidad solo declarada no puede superar level 1; usa level 2+ únicamente cuando exista evidencia extraída del documento.',
    '- No inventes datos, empresas, fechas ni certificaciones.',
    '- Cada entrada debe incluir al menos una evidencia con su `source` (declared, extracted, verified o inferred).',
    '- Responde únicamente con JSON válido que cumpla el esquema indicado.'
].join('\n');
function createLlmProfileExtractor(options) {
    const systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const maxTextChars = options.maxTextChars ?? 12000;
    const shouldRedact = options.redact ?? true;
    return {
        kind: 'llm',
        async extract (input) {
            const redaction = shouldRedact ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$pii$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["redactPii"])(input.text) : {
                text: input.text,
                replacements: 0,
                kinds: []
            };
            const clipped = redaction.text.slice(0, maxTextChars);
            const hint = [
                `Provenance of the source text: ${input.provenance}.`,
                input.targetRoles?.length ? `Target roles: ${input.targetRoles.join(', ')}.` : '',
                input.locale ? `Locale: ${input.locale}.` : ''
            ].filter(Boolean).join('\n');
            const result = await options.chat({
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: `${hint}\n\nTexto del candidato:\n${clipped}`
                    }
                ],
                jsonSchema: {
                    name: 'profile_draft',
                    schema: LLM_DRAFT_SCHEMA,
                    strict: false
                },
                temperature: 0
            });
            let parsed;
            try {
                parsed = JSON.parse(result.content);
            } catch  {
                throw new Error('LLM returned content that is not valid JSON');
            }
            const validation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$validators$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateProfileDraft"])(parsed);
            if (!validation.valid) {
                throw new Error(`LLM draft failed contract validation: ${validation.errors.join('; ')}`);
            }
            return {
                draft: parsed,
                kind: 'llm'
            };
        }
    };
}
}),
"[project]/apps/agent-runtime/src/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createAgentFromEnv",
    ()=>createAgentFromEnv
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/profile/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$heuristic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/heuristic.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$resilient$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/resilient.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$llm$2f$openrouter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/llm/openrouter.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$extractors$2f$llm$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/extractors/llm-extractor.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$profile$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/profile-agent.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/ingestion/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$ocr$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ingestion/src/ocr.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$fairness$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/fairness.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/extract/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$normalize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/normalize.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$ranking$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/ranking.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$adapters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/extract/adapters.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/text.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$verification$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/verification/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/index.ts [app-route] (ecmascript) <locals>");
;
;
;
;
;
function createAgentFromEnv(env = {}) {
    const warnings = [];
    if (!env.OPENROUTER_API_KEY) {
        warnings.push('OPENROUTER_API_KEY is not set; using the deterministic heuristic extractor.');
        return {
            agent: new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$profile$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ProfileAgent"](),
            mode: 'heuristic',
            extractor: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$heuristic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["heuristicProfileExtractor"],
            warnings
        };
    }
    const model = env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
    const chat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$llm$2f$openrouter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createOpenRouterChat"])({
        apiKey: env.OPENROUTER_API_KEY,
        model,
        baseUrl: env.OPENROUTER_BASE_URL
    });
    const primary = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$extractors$2f$llm$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createLlmProfileExtractor"])({
        chat
    });
    const extractor = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$resilient$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createResilientExtractor"])({
        primary,
        onFallback: (error)=>{
            warnings.push(`LLM extraction failed and fell back to the heuristic extractor: ${String(error)}`);
        }
    });
    const ocr = env.OPENROUTER_VISION_MODEL ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$ocr$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["visionOcrAdapter"])({
        describe: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$llm$2f$openrouter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createOpenRouterVision"])({
            apiKey: env.OPENROUTER_API_KEY,
            model: env.OPENROUTER_VISION_MODEL,
            baseUrl: env.OPENROUTER_BASE_URL
        })
    }) : undefined;
    return {
        agent: new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$profile$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ProfileAgent"]({
            extractor,
            ocr
        }),
        mode: 'llm',
        extractor,
        warnings
    };
}
;
;
;
;
;
;
;
;
;
;
;
;
;
}),
"[project]/apps/agent-runtime/src/llm/openrouter.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Thin OpenRouter client used by the Profile agent. Only the request/response
 * shapes this ticket needs are implemented; retries, model fallback chains and
 * token budgets are owned by the workflow/safety plane (ticket #9).
 */ __turbopack_context__.s([
    "OpenRouterError",
    ()=>OpenRouterError,
    "createOpenRouterChat",
    ()=>createOpenRouterChat,
    "createOpenRouterVision",
    ()=>createOpenRouterVision
]);
class OpenRouterError extends Error {
    status;
    constructor(message, status){
        super(message);
        this.name = 'OpenRouterError';
        if (status !== undefined) this.status = status;
    }
}
/** Shared auth/attribution headers for every OpenRouter call. */ function authHeaders(options) {
    return {
        'content-type': 'application/json',
        authorization: `Bearer ${options.apiKey}`,
        ...options.referer ? {
            'HTTP-Referer': options.referer
        } : {},
        ...options.title ? {
            'X-Title': options.title
        } : {}
    };
}
/** POST a JSON body and surface OpenRouter errors as typed `OpenRouterError`s. */ async function postJson(doFetch, url, headers, body, errorLabel) {
    const response = await doFetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    const parsed = await response.json();
    if (!response.ok) {
        throw new OpenRouterError(parsed.error?.message ?? `${errorLabel} (${response.status})`, response.status);
    }
    return parsed;
}
function createOpenRouterChat(options) {
    const baseUrl = (options.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const doFetch = options.fetchImpl ?? fetch;
    return async (request)=>{
        const body = {
            model: options.model,
            messages: request.messages
        };
        if (request.temperature !== undefined) body.temperature = request.temperature;
        if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
        if (request.jsonSchema) {
            body.response_format = {
                type: 'json_schema',
                json_schema: {
                    name: request.jsonSchema.name,
                    strict: request.jsonSchema.strict ?? true,
                    schema: request.jsonSchema.schema
                }
            };
        }
        const parsed = await postJson(doFetch, `${baseUrl}/chat/completions`, authHeaders(options), body, 'OpenRouter request failed');
        const content = parsed.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || content.length === 0) {
            throw new OpenRouterError('OpenRouter returned no message content');
        }
        const result = {
            content,
            model: parsed.model ?? options.model
        };
        if (parsed.usage) {
            result.usage = {
                promptTokens: parsed.usage.prompt_tokens ?? 0,
                completionTokens: parsed.usage.completion_tokens ?? 0
            };
        }
        return result;
    };
}
function createOpenRouterVision(options) {
    const baseUrl = (options.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const doFetch = options.fetchImpl ?? fetch;
    return async ({ bytes, mimeType })=>{
        const dataUrl = `data:${mimeType ?? 'image/png'};base64,${Buffer.from(bytes).toString('base64')}`;
        const parsed = await postJson(doFetch, `${baseUrl}/chat/completions`, authHeaders(options), {
            model: options.model,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Transcribe todo el texto legible de esta imagen de CV o documento. Devuelve solo el texto.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: dataUrl
                            }
                        }
                    ]
                }
            ]
        }, 'OpenRouter vision request failed');
        const text = parsed.choices?.[0]?.message?.content;
        if (typeof text !== 'string' || text.length === 0) {
            throw new OpenRouterError('OpenRouter vision returned no content');
        }
        return {
            text
        };
    };
}
}),
"[project]/apps/agent-runtime/src/pii.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Minimal PII redaction applied before any candidate text leaves the process
 * for an external model. The full PII vault from the grill doc is a later
 * concern; this keeps names/emails/phones out of the prompt in the meantime and
 * is deliberately conservative about what it replaces.
 */ __turbopack_context__.s([
    "redactPii",
    ()=>redactPii
]);
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const ID_DOCUMENT = /\b(?:[A-Z]?-?\d{2,4}-?\d{3,4}-?\d{3,5})\b/g;
function redactPii(input) {
    let text = input;
    let replacements = 0;
    const kinds = new Set();
    text = text.replace(EMAIL, ()=>{
        replacements += 1;
        kinds.add('email');
        return '[EMAIL]';
    });
    text = text.replace(PHONE, ()=>{
        replacements += 1;
        kinds.add('phone');
        return '[PHONE]';
    });
    text = text.replace(ID_DOCUMENT, ()=>{
        replacements += 1;
        kinds.add('id_document');
        return '[ID]';
    });
    return {
        text,
        replacements,
        kinds: [
            ...kinds
        ].sort()
    };
}
}),
"[project]/apps/agent-runtime/src/profile-agent.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProfileAgent",
    ()=>ProfileAgent,
    "createProfileAgent",
    ()=>createProfileAgent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/profile/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$build$2d$profile$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/build-profile.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$heuristic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/heuristic.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/ingestion/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$extract$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ingestion/src/extract.ts [app-route] (ecmascript)");
;
;
class ProfileAgent {
    options;
    constructor(options = {}){
        this.options = options;
    }
    get extractor() {
        return this.options.extractor ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$heuristic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["heuristicProfileExtractor"];
    }
    async run(raw, context) {
        const { text, source, warnings } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$extract$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractText"])(raw, {
            pdf: this.options.pdf,
            ocr: this.options.ocr,
            now: this.options.now
        });
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$build$2d$profile$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildProfile"])({
            text,
            source,
            provenance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$build$2d$profile$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["provenanceForIntakeKind"])(raw.kind),
            traceId: context.traceId,
            targetRoles: context.targetRoles,
            candidateId: context.candidateId,
            locale: context.locale,
            warnings
        }, {
            extractor: this.options.extractor,
            now: this.options.now
        });
    }
}
function createProfileAgent(options = {}) {
    return new ProfileAgent(options);
}
}),
"[project]/apps/agent-runtime/src/vacancy/errors.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExtractionUnavailableError",
    ()=>ExtractionUnavailableError,
    "InvalidJobRequirementsError",
    ()=>InvalidJobRequirementsError,
    "ReviewNotFoundError",
    ()=>ReviewNotFoundError,
    "VacancyInputError",
    ()=>VacancyInputError
]);
class VacancyInputError extends Error {
    constructor(message){
        super(message);
        this.name = "VacancyInputError";
    }
}
class ExtractionUnavailableError extends Error {
    inputKind;
    constructor(inputKind, cause){
        super(`No extraction adapter is available for "${inputKind}" input. Provide one through NormalizeVacancyOptions.extraction or install the default adapter dependency.`);
        this.name = "ExtractionUnavailableError";
        this.inputKind = inputKind;
        if (cause !== undefined) {
            this.cause = cause;
        }
    }
}
class ReviewNotFoundError extends Error {
    constructor(reviewId){
        super(`No pending review found for id "${reviewId}".`);
        this.name = "ReviewNotFoundError";
    }
}
class InvalidJobRequirementsError extends Error {
    errors;
    constructor(errors){
        super(`Normalized vacancy failed JobRequirements validation: ${(errors ?? []).map((error)=>`${error.instancePath || "/"} ${error.message ?? "is invalid"}`).join("; ")}`);
        this.name = "InvalidJobRequirementsError";
        this.errors = errors;
    }
}
}),
"[project]/apps/agent-runtime/src/vacancy/extract/adapters.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$pdf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/extract/pdf.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$image$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/extract/image.ts [app-route] (ecmascript)");
;
;
}),
"[project]/apps/agent-runtime/src/vacancy/extract/image.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "defaultImageExtractor",
    ()=>defaultImageExtractor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/errors.ts [app-route] (ecmascript)");
;
async function defaultImageExtractor(data, _mimeType, _filename) {
    try {
        const tesseract = await __turbopack_context__.A("[project]/apps/web/lib/optional/tesseract.ts [app-route] (ecmascript, async loader)");
        const result = await tesseract.recognize(Buffer.from(data), "spa+eng");
        return {
            text: result.data.text,
            extractor: "tesseract.js"
        };
    } catch (error) {
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ExtractionUnavailableError"]) throw error;
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ExtractionUnavailableError"]("image", error);
    }
}
}),
"[project]/apps/agent-runtime/src/vacancy/extract/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "extractVacancy",
    ()=>extractVacancy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/text.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$image$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/extract/image.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$pdf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/extract/pdf.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$structured$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/extract/structured.ts [app-route] (ecmascript)");
;
;
;
;
function extractedFromText(text, source, extractor) {
    const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseVacancyText"])(text);
    return {
        source,
        extractor,
        vacancyId: null,
        title: parsed.title ?? "Vacante",
        employer: null,
        locale: "es-PA",
        location: {
            ...__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$structured$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_LOCATION"]
        },
        rawText: text,
        mandatory: parsed.mandatory,
        desirable: parsed.desirable
    };
}
async function extractVacancy(input, ports = {}) {
    switch(input.kind){
        case "manual":
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$structured$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractStructured"])(input.vacancy, "manual");
        case "json":
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$structured$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractJson"])(input.json);
        case "pdf":
            {
                const extractor = ports.pdf ?? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$pdf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["defaultPdfExtractor"];
                const { text, extractor: name } = await extractor(input.data, input.filename);
                return extractedFromText(text, "pdf", name);
            }
        case "image":
            {
                const extractor = ports.image ?? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$image$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["defaultImageExtractor"];
                const { text, extractor: name } = await extractor(input.data, input.mimeType, input.filename);
                return extractedFromText(text, "image", name);
            }
    }
}
;
}),
"[project]/apps/agent-runtime/src/vacancy/extract/pdf.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "defaultPdfExtractor",
    ()=>defaultPdfExtractor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/errors.ts [app-route] (ecmascript)");
;
/** Group pdf.js text items into visual lines using their y coordinate. */ function joinTextItems(items) {
    const rows = [];
    for (const raw of items){
        const item = raw;
        if (typeof item.str !== "string" || item.str.length === 0) continue;
        const transform = Array.isArray(item.transform) ? item.transform : [];
        const y = typeof transform[5] === "number" ? transform[5] : 0;
        const last = rows[rows.length - 1];
        if (last !== undefined && Math.abs(last.y - y) <= 2) {
            last.text = `${last.text} ${item.str}`;
        } else {
            rows.push({
                y,
                text: item.str
            });
        }
    }
    return rows.map((row)=>row.text).join("\n");
}
async function defaultPdfExtractor(data, _filename) {
    try {
        // unpdf's current PDF.js bundle targets Node 22's Iterator global. Keep
        // the adapter usable on the repository's Node 20 test/runtime baseline.
        if (typeof globalThis.Iterator === "undefined") {
            globalThis.Iterator = class Iterator {
            };
        }
        const unpdf = await __turbopack_context__.A("[externals]/unpdf [external] (unpdf, esm_import, [project]/node_modules/unpdf, async loader)");
        const document = await unpdf.getDocumentProxy(new Uint8Array(data));
        const pages = [];
        for(let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1){
            const page = await document.getPage(pageNumber);
            const content = await page.getTextContent();
            pages.push(joinTextItems(content.items));
        }
        return {
            text: pages.join("\n"),
            extractor: "unpdf"
        };
    } catch (error) {
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ExtractionUnavailableError"]) throw error;
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ExtractionUnavailableError"]("pdf", error);
    }
}
}),
"[project]/apps/agent-runtime/src/vacancy/extract/structured.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_LOCATION",
    ()=>DEFAULT_LOCATION,
    "extractJson",
    ()=>extractJson,
    "extractStructured",
    ()=>extractStructured,
    "normalizeLocation",
    ()=>normalizeLocation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/errors.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/text.ts [app-route] (ecmascript)");
;
;
;
const DEFAULT_LOCATION = {
    country: "PA",
    province: null,
    district: null,
    raw: null
};
function coerceRequirement(raw) {
    if (typeof raw === "string") {
        const text = raw.trim();
        if (text.length === 0) return null;
        const normalized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeText"])(text);
        return {
            text,
            kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inferKind"])(normalized),
            level: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseLevel"])(normalized)
        };
    }
    if (raw === null || typeof raw !== "object" || typeof raw.text !== "string") {
        return null;
    }
    const text = raw.text.trim();
    if (text.length === 0) return null;
    const normalized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeText"])(text);
    return {
        text,
        kind: raw.kind ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inferKind"])(normalized),
        level: raw.level ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseLevel"])(normalized),
        justification: raw.justification ?? null
    };
}
function coerceRequirements(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(coerceRequirement).filter((requirement)=>requirement !== null);
}
function normalizeLocation(location) {
    if (location === null || location === undefined) return {
        ...DEFAULT_LOCATION
    };
    if (typeof location === "string") {
        return {
            ...DEFAULT_LOCATION,
            raw: location
        };
    }
    return {
        country: location.country ?? DEFAULT_LOCATION.country,
        province: location.province ?? null,
        district: location.district ?? null,
        raw: location.raw ?? null
    };
}
function extractStructured(vacancy, source) {
    if (vacancy === null || typeof vacancy !== "object" || typeof vacancy.title !== "string" || vacancy.title.trim().length === 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VacancyInputError"]("A structured vacancy requires a non-empty title.");
    }
    let mandatory = coerceRequirements(vacancy.mandatory);
    let desirable = coerceRequirements(vacancy.desirable);
    const rawText = typeof vacancy.rawText === "string" ? vacancy.rawText : null;
    if (mandatory.length === 0 && desirable.length === 0 && rawText !== null) {
        const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseVacancyText"])(rawText);
        mandatory = parsed.mandatory;
        desirable = parsed.desirable;
    }
    return {
        source,
        extractor: "structured",
        vacancyId: vacancy.vacancyId ?? null,
        title: vacancy.title.trim(),
        employer: vacancy.employer ?? null,
        locale: vacancy.locale ?? "es-PA",
        location: normalizeLocation(vacancy.location),
        rawText,
        mandatory,
        desirable
    };
}
function asRecord(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VacancyInputError"]("Vacancy JSON must be an object.");
    }
    return value;
}
function extractJson(json) {
    let value = json;
    if (typeof json === "string") {
        try {
            value = JSON.parse(json);
        } catch (error) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VacancyInputError"](`Vacancy JSON could not be parsed: ${error.message}`);
        }
    }
    const record = asRecord(value);
    const hasExplicitBuckets = Array.isArray(record.mandatory) || Array.isArray(record.desirable);
    if (typeof record.title === "string" && hasExplicitBuckets) {
        return extractStructured(record, "json");
    }
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const description = typeof record.description === "string" ? record.description : typeof record.rawText === "string" ? record.rawText : null;
    if (title.length === 0 && description === null) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VacancyInputError"]("Vacancy JSON must contain a title and requirement buckets, or a title/description pair.");
    }
    return extractStructured({
        vacancyId: typeof record.vacancyId === "string" ? record.vacancyId : undefined,
        title: title.length > 0 ? title : "Vacante",
        employer: typeof record.employer === "string" ? record.employer : null,
        locale: typeof record.locale === "string" ? record.locale : undefined,
        location: record.location === undefined ? undefined : record.location,
        rawText: description ?? undefined
    }, "json");
}
}),
"[project]/apps/agent-runtime/src/vacancy/fairness.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FAIRNESS_RULES",
    ()=>FAIRNESS_RULES,
    "FAIRNESS_RULES_VERSION",
    ()=>FAIRNESS_RULES_VERSION,
    "classifyRequirement",
    ()=>classifyRequirement
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy.ts [app-route] (ecmascript)");
;
const FAIRNESS_RULES_VERSION = "2026.10.0";
const APPEARANCE = {
    id: "fairness.appearance",
    classification: "prohibited",
    patterns: [
        "\\bbuena presencia\\b",
        "\\bbuena apariencia\\b",
        "\\bexcelente presencia\\b",
        "\\bagradable presencia\\b",
        "\\bbuen aspecto\\b",
        "\\bbuena imagen\\b",
        "\\baspecto fisico\\b",
        "\\bapariencia fisica\\b",
        "\\bpresentacion personal\\b",
        "\\bbuena presentacion\\b",
        "\\bexcelente presentacion\\b",
        "\\bagradable presentacion\\b",
        "\\bgood appearance\\b",
        "\\bgood looking\\b",
        "\\bpleasant appearance\\b",
        "\\bprofessional appearance\\b",
        "\\bphysical appearance\\b"
    ],
    reason: "Physical appearance or 'presence' is a personal characteristic and cannot justify a hiring requirement for these roles."
};
const PROTECTED_TRAITS = {
    id: "fairness.protected_traits",
    classification: "prohibited",
    patterns: [
        "\\bsexo\\s+(masculino|femenino)\\b",
        "\\bsolo\\s+(hombres|mujeres)\\b",
        "\\bde preferencia\\s+(hombre|mujer)\\b",
        "\\b(male|female)\\s+only\\b",
        "\\bestado civil\\b",
        "\\bsolter[oa]\\b",
        "\\bcasad[oa]\\b",
        "\\bsin hijos\\b",
        "\\bno tener hijos\\b",
        "\\breligion\\b",
        "\\bcatolic[oa]\\b",
        "\\bcristian[oa]\\b",
        "\\braza\\b",
        "\\betnia\\b",
        "\\bembaraz\\w*\\b",
        "\\bafiliacion politica\\b",
        "\\bpartido politico\\b",
        "\\bsin discapacidad\\b",
        "\\bno tener discapacidad\\b"
    ],
    reason: "References a protected personal trait (sex, marital status, religion, race, ethnicity, pregnancy, political opinion, or disability)."
};
const AGE = {
    id: "fairness.age",
    classification: "potentially_discriminatory",
    patterns: [
        "\\bentre\\s+\\d{1,2}\\s*(a|y|-|\\.\\.\\.)\\s*\\d{1,2}\\s*anos\\b",
        "\\bmenor(es)?\\s+de\\s+\\d{1,2}\\s*anos\\b",
        "\\bmayor(es)?\\s+de\\s+\\d{1,2}\\s*anos\\b",
        "\\bedad\\b",
        "\\b\\d{2}\\s*anos\\b(?!\\s*de\\s+(experiencia|servicio|trabajo))",
        "\\bage\\s*\\d{1,2}\\b",
        "\\bbetween\\s+\\d{1,2}\\s+and\\s+\\d{1,2}\\b",
        "\\bunder\\s+\\d{1,2}\\b",
        "\\bover\\s+\\d{1,2}\\b",
        "\\byears?\\s+old\\b",
        "\\bjoven(es)?\\b",
        "\\byoung\\b"
    ],
    reason: "An age limit is potentially discriminatory unless a specific legal or job-safety justification is documented.",
    requiresJustification: true
};
const PHYSICAL_MEASUREMENTS = {
    id: "fairness.physical_measurements",
    classification: "potentially_discriminatory",
    patterns: [
        "\\bestatura\\b",
        "\\baltura\\b",
        "\\bpeso\\b",
        "\\btalla\\b",
        "\\bcomplexion\\b",
        "\\bheight\\b",
        "\\bweight\\b"
    ],
    reason: "A physical measurement is potentially discriminatory unless a documented job-safety justification exists.",
    requiresJustification: true
};
const PHOTO = {
    id: "fairness.photo",
    classification: "potentially_discriminatory",
    patterns: [
        "\\bfoto\\b",
        "\\bfotografia\\b",
        "\\bfotografias?\\b",
        "\\bphoto\\b",
        "\\bphotograph\\b",
        "\\bpassport size\\b"
    ],
    reason: "Requiring a photo can expose candidates to bias unless it has a documented, job-related justification.",
    requiresJustification: true
};
const SUBJECTIVE_TRAITS = {
    id: "fairness.subjective_traits",
    classification: "ambiguous",
    patterns: [
        "\\bdinamic[oa]\\b",
        "\\bproactiv[oa]\\b",
        "\\bbuena actitud\\b",
        "\\bexcelente actitud\\b",
        "\\balta energia\\b",
        "\\bdon de gente\\b",
        "\\bcarisma\\b",
        "\\benergia positiva\\b",
        "\\bmuchas ganas\\b",
        "\\bself starter\\b",
        "\\bself-starter\\b",
        "\\bgo getter\\b",
        "\\bgo-getter\\b",
        "\\bpeople person\\b",
        "\\bpositive attitude\\b",
        "\\bdynamic\\b",
        "\\bproactive\\b"
    ],
    reason: "Subjective trait that cannot be objectively verified and must be reviewed before it affects ranking."
};
const FAIRNESS_RULES = [
    APPEARANCE,
    PROTECTED_TRAITS,
    AGE,
    PHYSICAL_MEASUREMENTS,
    PHOTO,
    SUBJECTIVE_TRAITS
];
function classifyRequirement(wording, justification) {
    const normalized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeText"])(wording);
    if (!normalized) return null;
    const hasJustification = typeof justification === "string" && justification.trim().length > 0;
    for (const rule of FAIRNESS_RULES){
        for (const pattern of rule.patterns){
            const match = new RegExp(pattern).exec(normalized);
            if (match?.[0]) {
                return {
                    classification: rule.classification,
                    ruleId: rule.id,
                    reason: rule.reason,
                    matchedText: match[0],
                    justified: rule.requiresJustification === true && hasJustification
                };
            }
        }
    }
    return null;
}
}),
"[project]/apps/agent-runtime/src/vacancy/normalize.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "normalizeExtractedVacancy",
    ()=>normalizeExtractedVacancy,
    "normalizeVacancy",
    ()=>normalizeVacancy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/ajv.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/errors.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/extract/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$fairness$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/fairness.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$status$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/status.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/text.ts [app-route] (ecmascript)");
;
;
;
;
;
;
function buildRequirements(extracted, taxonomy) {
    const flat = [
        ...extracted.mandatory.map((raw)=>({
                category: "mandatory",
                raw
            })),
        ...extracted.desirable.map((raw)=>({
                category: "desirable",
                raw
            }))
    ];
    return flat.map((entry, index)=>{
        const originalWording = entry.raw.text.trim();
        const normalizedWording = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeText"])(originalWording);
        const requirement = {
            id: `req-${index + 1}`,
            kind: entry.raw.kind ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inferKind"])(normalizedWording),
            category: entry.category,
            originalWording,
            normalizedWording,
            canonical: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["matchVacancySkill"])(originalWording, taxonomy),
            level: entry.raw.level ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseLevel"])(normalizedWording),
            justification: entry.raw.justification ?? null,
            alertId: null,
            rankingEligible: true,
            excludedFromRanking: false
        };
        return requirement;
    });
}
/**
 * Apply fairness checks to every requirement. Prohibited requirements are
 * blocked; ambiguous and potentially discriminatory requirements are routed to
 * human review. Every flagged requirement is excluded from ranking until a
 * reviewer resolves it (see `resolveReview`). A supplied justification never
 * bypasses the check: it is carried into the alert reason so the reviewer can
 * verify it.
 */ function applyFairness(requirements) {
    const alerts = [];
    const reviewQueue = [];
    const blockingReasons = [];
    for (const requirement of requirements){
        const classification = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$fairness$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["classifyRequirement"])(requirement.originalWording, requirement.justification);
        if (classification === null) continue;
        const alertId = `alert-${alerts.length + 1}`;
        const alertClassification = classification.classification;
        const reason = classification.justified ? `${classification.reason} A justification was supplied and must be verified by a reviewer before this requirement can be ranked.` : classification.reason;
        alerts.push({
            id: alertId,
            requirementId: requirement.id,
            classification: alertClassification,
            ruleId: classification.ruleId,
            reason,
            matchedText: classification.matchedText,
            disposition: alertClassification === "prohibited" ? "blocked" : "human_review",
            resolved: false,
            resolution: null
        });
        requirement.alertId = alertId;
        requirement.rankingEligible = false;
        requirement.excludedFromRanking = true;
        if (alertClassification === "prohibited") {
            blockingReasons.push(`Prohibited requirement blocked (rule ${classification.ruleId}): "${requirement.originalWording}"`);
        } else {
            reviewQueue.push({
                reviewId: `review-${reviewQueue.length + 1}`,
                requirementId: requirement.id,
                alertId,
                classification: alertClassification,
                status: "pending_human_review",
                reason
            });
        }
    }
    return {
        alerts,
        reviewQueue,
        blockingReasons
    };
}
function buildDocument(extracted, options) {
    const taxonomy = options.taxonomy ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PANAMA_SKILL_TAXONOMY"];
    const now = options.now ?? (()=>new Date());
    const capturedAt = options.capturedAt ?? now().toISOString();
    const vacancyId = options.vacancyId?.trim() || extracted.vacancyId?.trim() || (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$text$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["slugify"])(extracted.title);
    if (vacancyId.length === 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VacancyInputError"]("Unable to derive a vacancy id from the input.");
    }
    const requirements = buildRequirements(extracted, taxonomy);
    const { alerts, reviewQueue, blockingReasons } = applyFairness(requirements);
    const status = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$status$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolveStatus"])(blockingReasons, reviewQueue);
    return {
        schemaVersion: "1.0.0",
        vacancyId,
        title: extracted.title,
        employer: extracted.employer,
        source: extracted.source,
        capturedAt,
        locale: extracted.locale,
        taxonomyVersion: taxonomy.version,
        status,
        location: extracted.location,
        requirements,
        alerts,
        reviewQueue,
        blockingReasons,
        metadata: {
            inputKind: extracted.source,
            extractor: extracted.extractor,
            extractedAt: capturedAt,
            rawText: extracted.rawText,
            requirementCount: requirements.length,
            mandatoryCount: requirements.filter((r)=>r.category === "mandatory").length,
            desirableCount: requirements.filter((r)=>r.category === "desirable").length,
            alertCount: alerts.length,
            excludedCount: requirements.filter((r)=>r.excludedFromRanking).length
        }
    };
}
function normalizeExtractedVacancy(extracted, options = {}) {
    const document = buildDocument(extracted, options);
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateJobRequirements"])(document)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["InvalidJobRequirementsError"](__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateJobRequirements"].errors);
    }
    return document;
}
async function normalizeVacancy(input, options = {}) {
    const extracted = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$extract$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["extractVacancy"])(input, options.extraction);
    return normalizeExtractedVacancy(extracted, options);
}
}),
"[project]/apps/agent-runtime/src/vacancy/ranking.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getExcludedRequirements",
    ()=>getExcludedRequirements,
    "getPendingReviews",
    ()=>getPendingReviews,
    "getRankableRequirements",
    ()=>getRankableRequirements,
    "isVacancyRankable",
    ()=>isVacancyRankable,
    "resolveReview",
    ()=>resolveReview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/ajv.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/errors.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$status$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/vacancy/status.ts [app-route] (ecmascript)");
;
;
;
function getRankableRequirements(document) {
    return document.requirements.filter((requirement)=>requirement.rankingEligible);
}
function getExcludedRequirements(document) {
    return document.requirements.filter((requirement)=>requirement.excludedFromRanking);
}
function getPendingReviews(document) {
    return document.reviewQueue;
}
function isVacancyRankable(document) {
    return document.status !== "blocked";
}
function revalidate(document) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateJobRequirements"])(document)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["InvalidJobRequirementsError"](__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateJobRequirements"].errors);
    }
    return document;
}
function resolveReview(document, decision) {
    const review = document.reviewQueue.find((item)=>item.reviewId === decision.reviewId);
    if (!review) throw new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ReviewNotFoundError"](decision.reviewId);
    const resolvedAt = decision.resolvedAt ?? new Date().toISOString();
    const approved = decision.decision === "approved";
    const requirements = document.requirements.map((requirement)=>{
        if (requirement.id !== review.requirementId) return requirement;
        if (!approved) return requirement;
        return {
            ...requirement,
            rankingEligible: true,
            excludedFromRanking: false
        };
    });
    const alerts = document.alerts.map((alert)=>alert.id === review.alertId ? {
            ...alert,
            resolved: true,
            resolution: {
                decision: decision.decision,
                reviewer: decision.reviewer,
                resolvedAt
            }
        } : alert);
    const reviewQueue = document.reviewQueue.filter((item)=>item.reviewId !== decision.reviewId);
    return revalidate({
        ...document,
        requirements,
        alerts,
        reviewQueue,
        status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$vacancy$2f$status$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolveStatus"])(document.blockingReasons, reviewQueue)
    });
}
}),
"[project]/apps/agent-runtime/src/vacancy/status.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "resolveStatus",
    ()=>resolveStatus
]);
function resolveStatus(blockingReasons, reviewQueue) {
    if (blockingReasons.length > 0) return "blocked";
    if (reviewQueue.length > 0) return "requires_human_review";
    return "accepted";
}
}),
"[project]/apps/agent-runtime/src/vacancy/text.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "inferKind",
    ()=>inferKind,
    "parseLevel",
    ()=>parseLevel,
    "parseVacancyText",
    ()=>parseVacancyText,
    "slugify",
    ()=>slugify
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy.ts [app-route] (ecmascript)");
;
const BULLET = /^\s*(?:[-*•·‣▪►]|\d{1,3}[.)]|[a-z][.)])\s+/i;
const DESIRABLE_HEADING = /(deseable|deseados|preferible|valorables?|plus|nice to have|preferred|no excluyente|no obligatorio)/i;
const MANDATORY_HEADING = /(requisitos?|requerimientos?|imprescindible|obligatorios?|exigidos?|indispensable|debe cumplir|cualificaciones|mandatory|required|requirements|must have|qualifications|el candidato debe)/i;
const IGNORED_HEADING = /^(funciones|responsabilidades|tareas|responsibilities|duties|beneficios|benefits|ofrecemos|about|descripcion|descripción|sobre|acerca)/i;
const KIND_PATTERNS = [
    [
        "language",
        /\b(ingles|english|idioma|language|bilingue|bilingual|espanol|spanish)\b/
    ],
    [
        "certification",
        /\b(certificacion|certificado|certificate|certification|licencia|license|acreditacion|accreditation)\b/
    ],
    [
        "education",
        /\b(licenciatura|bachiller|secundaria|universidad|universitario|titulo|degree|graduado|graduate|diploma|educacion|education)\b/
    ],
    [
        "experience",
        /\b(experiencia|experience|anos|years|trayectoria|background)\b/
    ],
    [
        "physical",
        /\b(presencia|apariencia|aspecto fisico|estatura|altura|peso|talla|fisico|physical|appearance|levantar)\b/
    ]
];
const CEFR_LEVELS = {
    a1: 1,
    a2: 1,
    b1: 2,
    b2: 3,
    c1: 4,
    c2: 4
};
function inferKind(normalizedWording) {
    for (const [kind, pattern] of KIND_PATTERNS){
        if (pattern.test(normalizedWording)) return kind;
    }
    return "skill";
}
function parseLevel(normalizedWording) {
    const explicit = /\bnivel\s*([0-4])\b/.exec(normalizedWording);
    if (explicit?.[1]) return Number(explicit[1]);
    const cefr = /\b(a1|a2|b1|b2|c1|c2)\b/.exec(normalizedWording);
    if (cefr?.[1]) {
        const mapped = CEFR_LEVELS[cefr[1]];
        if (mapped !== undefined) return mapped;
    }
    if (/\b(experto|experta|nativo|nativa)\b/.test(normalizedWording)) return 4;
    if (/\b(avanzado|avanzada)\b/.test(normalizedWording)) return 3;
    if (/\b(intermedio|intermedia)\b/.test(normalizedWording)) return 2;
    if (/\b(principiante|basico|basica)\b/.test(normalizedWording)) return 1;
    return null;
}
function slugify(value) {
    const slug = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeText"])(value).replace(/\s+/g, "-");
    return slug.length > 0 ? slug : "vacancy";
}
function toRequirementInput(line) {
    const text = line.replace(BULLET, "").trim();
    const normalized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeText"])(text);
    return {
        text,
        kind: inferKind(normalized),
        level: parseLevel(normalized)
    };
}
/**
 * Restore line breaks that extractors can drop. PDF and OCR output is often a
 * single run of text containing inline bullets ("… - Manejo de caja - Buena
 * presencia") or section headings ("… Deseables: …").
 */ function preprocess(text) {
    return text.replace(/\r\n?/g, "\n").replace(/\s+(?=(?:requisitos?|requerimientos?|deseables?|deseados?|preferibles?|requirements?|mandatory|required|preferred|nice to have)\s*:)/gi, "\n").replace(/\s+(?=(?:[-*•·‣▪►]|\d{1,3}[.)])\s)/g, "\n");
}
function parseVacancyText(text) {
    const lines = preprocess(text).split(/\r?\n/).map((line)=>line.trim()).filter((line)=>line.length > 0);
    let title = null;
    let mode = null;
    let sawHeading = false;
    const mandatory = [];
    const desirable = [];
    const HEADING_START = /^(requisitos?|requerimientos?|mandatory|required|requirements|deseables?|preferred|must have|nice to have|imprescindible|obligatorios?|exigidos?|valorables?)/i;
    for (const line of lines){
        const isBullet = BULLET.test(line);
        const content = line.replace(BULLET, "").trim();
        const looksLikeHeading = !isBullet && content.length <= 80 && (line.endsWith(":") || HEADING_START.test(content));
        if (looksLikeHeading && DESIRABLE_HEADING.test(line)) {
            mode = "desirable";
            sawHeading = true;
            continue;
        }
        if (looksLikeHeading && MANDATORY_HEADING.test(line)) {
            mode = "mandatory";
            sawHeading = true;
            continue;
        }
        if (IGNORED_HEADING.test(content)) {
            mode = "closed";
            sawHeading = true;
            continue;
        }
        if (title === null && !isBullet && content.length > 3 && !looksLikeHeading) {
            title = content;
            continue;
        }
        if (mode === "closed") continue;
        if (mode === null) {
            if (isBullet) {
                mandatory.push(toRequirementInput(line));
            }
            continue;
        }
        if (content.length < 2) continue;
        if (mode === "mandatory") mandatory.push(toRequirementInput(line));
        else desirable.push(toRequirementInput(line));
    }
    // Fallback: long bullet-free text with no recognizable sections at all.
    if (!sawHeading && mandatory.length === 0 && desirable.length === 0) {
        for (const line of lines){
            const content = line.replace(BULLET, "").trim();
            if (content.length >= 15 && content !== title) {
                mandatory.push(toRequirementInput(line));
            }
        }
    }
    return {
        title,
        mandatory,
        desirable
    };
}
}),
"[project]/apps/agent-runtime/src/verification/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
(()=>{
    const e = new Error("Cannot find module './status.js'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module './schema.js'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module './metrics.js'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module './verify.js'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module './config.js'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
;
;
;
;
}),
"[project]/apps/agent-runtime/src/workflow/agents.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "runAgent",
    ()=>runAgent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/ajv.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$guardrails$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/guardrails.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$models$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/models.ts [app-route] (ecmascript)");
;
;
;
function publish(services, carrier, agent, kind, payload) {
    const envelope = {
        trace_id: carrier.traceId,
        idempotency_key: carrier.idempotencyKey,
        agent,
        kind,
        payload
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertAgentEnvelope"])(envelope);
    services.envelopes.push(envelope);
    services.emit?.({
        event: "envelope",
        data: envelope
    });
}
function move(services, id, next, reason) {
    const record = services.dql.transition(id, next, reason, services.clock());
    services.emit?.({
        event: "lifecycle",
        data: record
    });
    return record;
}
function audit(services, carrier, agent, action, fields = {}) {
    services.audit.append({
        trace_id: carrier.traceId,
        timestamp: services.clock(),
        actor: carrier.actorId,
        role: carrier.actorRole,
        agent,
        tool: fields.tool ?? null,
        evidence: fields.evidence ?? null,
        constraint: fields.constraint ?? null,
        modelFallback: fields.modelFallback ?? null,
        action
    });
}
function promptFor(agent, carrier) {
    return [
        `Agent ${agent}.`,
        `CV: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$guardrails$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["redactPii"])(carrier.candidateText).slice(0, 400)}`,
        `Vacancy: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$guardrails$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["redactPii"])(carrier.vacancyText).slice(0, 400)}`,
        "Reply with a short employability note and no contact details."
    ].join(" ");
}
function reject(carrier, services, agent, spanId, dqlId, findings) {
    for (const finding of findings){
        audit(services, carrier, agent, "guardrail_block", {
            tool: finding.stage === "permission" || finding.stage === "tool_result" ? finding.source : null,
            evidence: finding.source,
            constraint: finding.code
        });
    }
    const primary = findings[0];
    move(services, dqlId, "rejected", primary?.reason ?? "guardrail rejected the step");
    const span = services.traces.endSpan(spanId, {
        endTime: services.clock(),
        level: "ERROR",
        output: findings
    });
    services.emit?.({
        event: "trace",
        data: span
    });
    publish(services, carrier, agent, "event", {
        status: "rejected",
        findings
    });
    return {
        ...carrier,
        halted: true,
        status: "rejected",
        findings: [
            ...carrier.findings,
            ...findings
        ]
    };
}
async function runAgent(agent, carrier, services) {
    if (carrier.halted) return carrier;
    const tool = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$guardrails$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_AGENT_TOOL"][agent];
    const startedAt = services.clock();
    const span = services.traces.startSpan({
        id: `${carrier.traceId}:${agent}`,
        traceId: carrier.traceId,
        name: agent,
        startTime: startedAt,
        input: {
            agent
        },
        metadata: {
            agent,
            trace_id: carrier.traceId,
            actor: carrier.actorId,
            role: carrier.actorRole,
            tool,
            evidence: null,
            constraint: null
        }
    });
    const dqlId = `${carrier.traceId}:${agent}`;
    const pending = services.dql.enqueue(dqlId, carrier.traceId, startedAt, `${agent} started`);
    services.emit?.({
        event: "lifecycle",
        data: pending
    });
    publish(services, carrier, agent, "request", {
        tool,
        capability: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$models$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AGENT_CAPABILITIES"][agent]
    });
    if (agent === "exploration") {
        const findings = [
            ...carrier.requestedTools.map((requested)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$guardrails$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["screenRequestedTool"])(requested, carrier.actorRole)),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$guardrails$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["screenInput"])(carrier.candidateText, "candidate"),
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$guardrails$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["screenInput"])(carrier.vacancyText, "vacancy")
        ].filter((decision)=>!decision.allowed);
        if (findings.length > 0) {
            return reject(carrier, services, agent, span.id, dqlId, findings);
        }
    }
    const permission = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$guardrails$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["screenPermission"])({
        tool,
        agent,
        role: carrier.actorRole,
        source: tool
    });
    if (!permission.allowed) {
        return reject(carrier, services, agent, span.id, dqlId, [
            permission
        ]);
    }
    const prompt = promptFor(agent, carrier);
    try {
        const completion = await services.router.complete({
            capability: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$models$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AGENT_CAPABILITIES"][agent],
            prompt,
            estimatedTokens: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$models$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["estimateTokens"])(prompt)
        });
        const toolDecision = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$guardrails$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["screenToolResult"])({
            tool,
            agent,
            role: carrier.actorRole,
            body: completion.text,
            declaredCredentials: carrier.declaredCredentials
        });
        if (!toolDecision.allowed) {
            return reject(carrier, services, agent, span.id, dqlId, [
                toolDecision
            ]);
        }
        const outputDecision = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$guardrails$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["screenOutput"])({
            text: completion.text,
            declaredCredentials: carrier.declaredCredentials,
            source: agent
        });
        if (!outputDecision.allowed) {
            return reject(carrier, services, agent, span.id, dqlId, [
                outputDecision
            ]);
        }
        if (completion.fallbacks.length > 0) {
            move(services, dqlId, "retrying", "primary model failed");
            for (const hop of completion.fallbacks){
                audit(services, carrier, agent, "model_fallback", {
                    tool,
                    modelFallback: `${hop.from} -> ${hop.to}`,
                    constraint: "model_fallback",
                    evidence: hop.to
                });
            }
        }
        move(services, dqlId, "success", `${agent} completed`);
        audit(services, carrier, agent, "agent_completed", {
            tool,
            evidence: completion.text.slice(0, 120),
            constraint: null
        });
        const closed = services.traces.endSpan(span.id, {
            endTime: services.clock(),
            output: completion.text,
            metadata: {
                modelId: completion.modelId,
                fallbacks: completion.fallbacks,
                evidence: completion.text.slice(0, 120)
            }
        });
        services.emit?.({
            event: "trace",
            data: closed
        });
        publish(services, carrier, agent, "response", {
            summary: completion.text,
            modelId: completion.modelId
        });
        return {
            ...carrier,
            summaries: [
                ...carrier.summaries,
                {
                    agent,
                    summary: completion.text
                }
            ],
            modelFallbacks: [
                ...carrier.modelFallbacks,
                ...completion.fallbacks.map((hop)=>({
                        capability: completion.capability,
                        from: hop.from,
                        to: hop.to
                    }))
            ],
            status: agent === "training" ? "success" : carrier.status
        };
    } catch (error) {
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$models$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ModelChainExhaustedError"] || error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$models$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BudgetExceededError"]) {
            const message = error.message;
            const attempted = error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$models$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ModelChainExhaustedError"] ? error.attempted : [];
            move(services, dqlId, "failed", attempted[0] ? `${attempted[0]} failed: ${message}` : message);
            for (const modelId of attempted.slice(1)){
                move(services, dqlId, "retrying", `called ${modelId}`);
                move(services, dqlId, "failed", `${modelId} failed: ${message}`);
            }
            move(services, dqlId, "dead_letter", message);
            audit(services, carrier, agent, "model_dead_letter", {
                tool,
                constraint: error.code,
                evidence: attempted.length > 0 ? attempted.join(",") : null
            });
            const closed = services.traces.endSpan(span.id, {
                endTime: services.clock(),
                level: "ERROR",
                output: {
                    message
                }
            });
            services.emit?.({
                event: "trace",
                data: closed
            });
            publish(services, carrier, agent, "event", {
                status: "dead_letter",
                message
            });
            return {
                ...carrier,
                halted: true,
                status: "dead_letter"
            };
        }
        throw error;
    }
}
}),
"[project]/apps/agent-runtime/src/workflow/carrier.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "assertCarrier",
    ()=>assertCarrier,
    "carrierSchema",
    ()=>carrierSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/ajv.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$carrier$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/carrier.schema.json.[json].cjs [app-route] (ecmascript)");
;
;
const validateCarrier = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ajv"].compile(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$carrier$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]);
function assertCarrier(value) {
    if (!validateCarrier(value)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AjvValidationError"]("WorkflowCarrier", validateCarrier.errors);
    }
}
function validateStandard(value) {
    if (validateCarrier(value)) return {
        value
    };
    return {
        issues: (validateCarrier.errors ?? []).map((error)=>({
                message: `${error.instancePath || "/"} ${error.message ?? "is invalid"}`
            }))
    };
}
const carrierSchema = {
    "~standard": {
        version: 1,
        vendor: "ajv",
        types: undefined,
        validate: validateStandard,
        jsonSchema: {
            input: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$carrier$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"],
            output: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$carrier$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]
        }
    }
};
}),
"[project]/apps/agent-runtime/src/workflow/graph.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WORKFLOW_ID",
    ()=>WORKFLOW_ID,
    "WorkflowRuntime",
    ()=>WorkflowRuntime,
    "createWorkflowRuntime",
    ()=>createWorkflowRuntime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mastra$2f$core$2f$dist$2f$agent$2d$Blan8B5o$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__Cr__as__createStep$3e$__ = __turbopack_context__.i("[project]/node_modules/@mastra/core/dist/agent-Blan8B5o.js [app-route] (ecmascript) <export Cr as createStep>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mastra$2f$core$2f$dist$2f$agent$2d$Blan8B5o$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__fr__as__createWorkflow$3e$__ = __turbopack_context__.i("[project]/node_modules/@mastra/core/dist/agent-Blan8B5o.js [app-route] (ecmascript) <export fr as createWorkflow>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/ajv.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$agents$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/agents.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$carrier$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/carrier.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$models$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/models.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$observability$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/observability.ts [app-route] (ecmascript)");
;
;
;
;
;
;
const WORKFLOW_ID = "puente-employability";
const AGENT_ORDER = [
    "exploration",
    "profile_and_evidence",
    "market_and_matching",
    "training"
];
function toCarrier(input) {
    return {
        traceId: input.trace_id,
        idempotencyKey: input.idempotency_key,
        candidateText: input.candidateText,
        vacancyText: input.vacancyText,
        declaredCredentials: input.declaredCredentials.map((credential)=>({
                ...credential
            })),
        actorId: input.actor.id,
        actorRole: input.actor.role,
        requestedTools: [
            ...input.requestedTools
        ],
        halted: false,
        status: "running",
        findings: [],
        summaries: [],
        modelFallbacks: []
    };
}
class WorkflowRuntime {
    audit = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$observability$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AppendOnlyAuditLog"]();
    dql = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$observability$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DqlStore"]();
    traces = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$observability$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LangfuseRecorder"]();
    lastIngestion = null;
    router;
    clock;
    langfuse;
    active = new Map();
    cache = new Map();
    workflow;
    constructor(deps){
        this.clock = deps.clock ?? (()=>new Date().toISOString());
        this.langfuse = deps.langfuse;
        this.router = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$models$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ModelRouter"](__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$models$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CAPABILITY_CHAINS"], deps.complete);
        if (deps.catalog) this.router.preflight(deps.catalog);
        this.workflow = this.build();
    }
    build() {
        const steps = AGENT_ORDER.map((agent)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mastra$2f$core$2f$dist$2f$agent$2d$Blan8B5o$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__Cr__as__createStep$3e$__["createStep"])({
                id: agent,
                description: `Puente ${agent} agent`,
                inputSchema: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$carrier$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["carrierSchema"],
                outputSchema: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$carrier$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["carrierSchema"],
                execute: async ({ inputData })=>{
                    const services = this.active.get(inputData.traceId);
                    if (!services) {
                        throw new Error(`No workflow services registered for trace ${inputData.traceId}`);
                    }
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$agents$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["runAgent"])(agent, inputData, services);
                }
            }));
        const [exploration, profile, market, training] = steps;
        if (!exploration || !profile || !market || !training) {
            throw new Error("Mastra workflow is missing an agent step");
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mastra$2f$core$2f$dist$2f$agent$2d$Blan8B5o$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__fr__as__createWorkflow$3e$__["createWorkflow"])({
            id: WORKFLOW_ID,
            description: "Coordinates Exploration, Profile and Evidence, Market and Matching, and Training.",
            inputSchema: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$carrier$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["carrierSchema"],
            outputSchema: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$carrier$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["carrierSchema"],
            options: {
                shouldPersistSnapshot: ()=>false
            }
        }).then(exploration).then(profile).then(market).then(training).commit();
    }
    async run(input, options = {}) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertWorkflowRun"])(input);
        const cached = this.cache.get(input.idempotency_key);
        if (cached) {
            for (const envelope of cached.envelopes){
                options.onEvent?.({
                    event: "envelope",
                    data: envelope
                });
            }
            return {
                ...cached,
                idempotentReplay: true
            };
        }
        const services = {
            audit: this.audit,
            dql: this.dql,
            traces: this.traces,
            router: this.router,
            clock: this.clock,
            envelopes: [],
            emit: options.onEvent
        };
        this.active.set(input.trace_id, services);
        services.traces.startTrace({
            id: input.trace_id,
            name: WORKFLOW_ID,
            timestamp: this.clock(),
            metadata: {
                trace_id: input.trace_id,
                idempotency_key: input.idempotency_key,
                actor: input.actor.id,
                role: input.actor.role
            }
        });
        try {
            const mastraRun = await this.workflow.createRun({
                runId: input.trace_id,
                shouldPersistSnapshot: ()=>false
            });
            const started = await mastraRun.start({
                inputData: toCarrier(input)
            });
            if (started.status !== "success") {
                const message = started.status === "failed" ? started.error.message : started.status;
                throw new Error(`Mastra workflow ${started.status}: ${message}`);
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$carrier$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertCarrier"])(started.result);
            const carrier = started.result;
            if (carrier.status === "running") {
                throw new Error("Mastra workflow finished without a terminal status");
            }
            const result = {
                trace_id: input.trace_id,
                idempotency_key: input.idempotency_key,
                status: carrier.status,
                idempotentReplay: false,
                findings: carrier.findings,
                agents: carrier.summaries,
                modelFallbacks: carrier.modelFallbacks,
                envelopes: [
                    ...services.envelopes
                ],
                mastraSteps: AGENT_ORDER.filter((agent)=>agent in started.steps)
            };
            this.lastIngestion = this.traces.flush();
            if (this.langfuse) await this.langfuse.ingest(this.lastIngestion);
            this.cache.set(input.idempotency_key, result);
            return result;
        } finally{
            this.active.delete(input.trace_id);
        }
    }
}
function createWorkflowRuntime(deps) {
    return new WorkflowRuntime(deps);
}
}),
"[project]/apps/agent-runtime/src/workflow/guardrails.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_AGENT_TOOL",
    ()=>DEFAULT_AGENT_TOOL,
    "evaluateGuardrailFixture",
    ()=>evaluateGuardrailFixture,
    "extractCredentialClaims",
    ()=>extractCredentialClaims,
    "findInjection",
    ()=>findInjection,
    "findPii",
    ()=>findPii,
    "inventedCredentialNames",
    ()=>inventedCredentialNames,
    "redactPii",
    ()=>redactPii,
    "screenInput",
    ()=>screenInput,
    "screenOutput",
    ()=>screenOutput,
    "screenPermission",
    ()=>screenPermission,
    "screenRequestedTool",
    ()=>screenRequestedTool,
    "screenSchema",
    ()=>screenSchema,
    "screenToolResult",
    ()=>screenToolResult
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/ajv.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy.ts [app-route] (ecmascript)");
;
const INJECTION_PATTERNS = [
    /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
    /ignora\s+las\s+instrucciones/i,
    /olvida(?:r)?\s+las\s+instrucciones/i,
    /reveal\s+the\s+system\s+prompt/i,
    /you\s+are\s+now\b/i,
    /\bjailbreak\b/i,
    /disregard\s+(?:the\s+)?(?:rules|policy|instructions)/i
];
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+507[\s-]?)?\b\d{4}[\s-]\d{4}\b/;
const CEDULA = /\b\d{1,2}-\d{1,4}-\d{1,6}\b/;
const CLAIM = /(?:credencial|credential|certificado)\s*:\s*([^\n.]{2,80})/gi;
const AGENT_TOOLS = {
    exploration: [
        "read_goals"
    ],
    profile_and_evidence: [
        "read_cv",
        "list_declared_credentials"
    ],
    market_and_matching: [
        "read_vacancy",
        "match_skills"
    ],
    training: [
        "suggest_course"
    ]
};
const ALWAYS_DENIED = new Set([
    "submit_application",
    "progress_interview",
    "send_message"
]);
const EMPLOYER_DENIED = new Set([
    "read_cv",
    "list_declared_credentials"
]);
const DEFAULT_AGENT_TOOL = {
    exploration: "read_goals",
    profile_and_evidence: "read_cv",
    market_and_matching: "read_vacancy",
    training: "suggest_course"
};
function allow(stage, source) {
    return {
        allowed: true,
        stage,
        code: "ok",
        reason: "passed",
        source
    };
}
function block(stage, code, reason, source) {
    return {
        allowed: false,
        stage,
        code,
        reason,
        source
    };
}
function findInjection(text) {
    for (const pattern of INJECTION_PATTERNS){
        const match = pattern.exec(text);
        if (match?.[0]) return match[0];
    }
    return null;
}
function findPii(text) {
    if (EMAIL.test(text)) return "email";
    if (PHONE.test(text)) return "phone";
    if (CEDULA.test(text)) return "cedula";
    return null;
}
function redactPii(text) {
    return text.replace(EMAIL, "[redacted-email]").replace(PHONE, "[redacted-phone]").replace(CEDULA, "[redacted-cedula]");
}
function screenInput(text, source) {
    const injection = findInjection(text);
    if (injection) {
        return block("input", "prompt_injection", `Instruction override detected: "${injection}"`, source);
    }
    return allow("input", source);
}
function screenPermission(input) {
    const source = input.source ?? input.tool;
    if (ALWAYS_DENIED.has(input.tool) || !AGENT_TOOLS[input.agent].includes(input.tool)) {
        return block("permission", "unauthorized_tool", `Tool "${input.tool}" is not permitted for ${input.agent}`, source);
    }
    if (input.role === "employer" && EMPLOYER_DENIED.has(input.tool)) {
        return block("permission", "unauthorized_tool", `Role ${input.role} cannot call "${input.tool}"`, source);
    }
    return allow("permission", source);
}
function owningAgent(tool) {
    const match = Object.entries(AGENT_TOOLS).find(([, tools])=>tools.includes(tool));
    return match?.[0];
}
function screenRequestedTool(tool, role) {
    if (ALWAYS_DENIED.has(tool)) {
        return block("permission", "unauthorized_tool", `Tool "${tool}" is not on the workflow allowlist`, tool);
    }
    const owner = owningAgent(tool);
    if (!owner) {
        return block("permission", "unauthorized_tool", `Tool "${tool}" is not on the workflow allowlist`, tool);
    }
    return screenPermission({
        tool,
        agent: owner,
        role,
        source: tool
    });
}
function inventedCredentialNames(claimed, declared) {
    const known = new Set(declared.map((credential)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeText"])(credential.name)));
    return claimed.filter((credential)=>!known.has((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeText"])(credential.name))).map((credential)=>credential.name);
}
function extractCredentialClaims(text) {
    const names = [];
    for (const match of text.matchAll(CLAIM)){
        const name = match[1]?.trim();
        if (name) names.push(name);
    }
    return names;
}
function claimsFromText(text) {
    return extractCredentialClaims(text).map((name)=>({
            id: `claim:${(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeText"])(name)}`,
            name
        }));
}
function screenToolResult(input) {
    const permission = screenPermission({
        tool: input.tool,
        agent: input.agent,
        role: input.role,
        source: input.tool
    });
    if (!permission.allowed) return permission;
    const injection = findInjection(input.body);
    if (injection) {
        return block("tool_result", "prompt_injection", `Tool result tried to override instructions: "${injection}"`, input.tool);
    }
    const invented = inventedCredentialNames(input.claimedCredentials ?? claimsFromText(input.body), input.declaredCredentials);
    if (invented.length > 0) {
        return block("tool_result", "invented_credential", `Credential is not in the declared set: ${invented.join(", ")}`, input.tool);
    }
    return allow("tool_result", input.tool);
}
function screenOutput(input) {
    const source = input.source ?? "output";
    const injection = findInjection(input.text);
    if (injection) {
        return block("output", "prompt_injection", `Output carried an instruction override: "${injection}"`, source);
    }
    const pii = findPii(input.text);
    if (pii) {
        return block("output", "pii_leak", `Output exposed ${pii}`, source);
    }
    const invented = inventedCredentialNames(input.claimedCredentials ?? claimsFromText(input.text), input.declaredCredentials);
    if (invented.length > 0) {
        return block("output", "invented_credential", `Output invented a credential: ${invented.join(", ")}`, source);
    }
    return allow("output", source);
}
function screenSchema(document, contract) {
    try {
        if (contract === "envelope") (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertAgentEnvelope"])(document);
        else (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertWorkflowRun"])(document);
        return allow("schema", contract);
    } catch (error) {
        const message = error instanceof Error ? error.message : "schema rejected the document";
        return block("schema", "invalid_schema", message, contract);
    }
}
function evaluateGuardrailFixture(fixture) {
    switch(fixture.stage){
        case "input":
            return screenInput(fixture.text ?? "", fixture.source ?? fixture.id);
        case "output":
            return screenOutput({
                text: fixture.text ?? "",
                declaredCredentials: fixture.declaredCredentials ?? [],
                claimedCredentials: fixture.claimedCredentials,
                source: fixture.source ?? fixture.id
            });
        case "permission":
            return screenPermission({
                tool: fixture.tool ?? "",
                agent: fixture.agent ?? "exploration",
                role: fixture.role ?? "candidate",
                source: fixture.source ?? fixture.tool
            });
        case "tool_result":
            return screenToolResult({
                tool: fixture.tool ?? "",
                agent: fixture.agent ?? "profile_and_evidence",
                role: fixture.role ?? "candidate",
                body: fixture.text ?? "",
                declaredCredentials: fixture.declaredCredentials ?? [],
                claimedCredentials: fixture.claimedCredentials
            });
        case "schema":
            return screenSchema(fixture.document, fixture.contract ?? "workflow-run");
        default:
            {
                const unknownStage = fixture.stage;
                throw new Error(`Unknown guardrail stage: ${String(unknownStage)}`);
            }
    }
}
}),
"[project]/apps/agent-runtime/src/workflow/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$guardrails$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/guardrails.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$graph$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/graph.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$transport$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/transport.ts [app-route] (ecmascript) <locals>");
;
;
;
;
;
}),
"[project]/apps/agent-runtime/src/workflow/models.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AGENT_CAPABILITIES",
    ()=>AGENT_CAPABILITIES,
    "BudgetExceededError",
    ()=>BudgetExceededError,
    "CAPABILITY_CHAINS",
    ()=>CAPABILITY_CHAINS,
    "ModelChainExhaustedError",
    ()=>ModelChainExhaustedError,
    "ModelRouter",
    ()=>ModelRouter,
    "createOpenRouterClient",
    ()=>createOpenRouterClient,
    "estimateTokens",
    ()=>estimateTokens
]);
const CAPABILITY_CHAINS = {
    extraction: {
        capability: "extraction",
        models: [
            "google/gemma-2-9b-it:free",
            "meta-llama/llama-3.2-3b-instruct:free"
        ],
        budgetTokens: 1500
    },
    matching: {
        capability: "matching",
        models: [
            "google/gemma-2-9b-it:free",
            "mistralai/mistral-7b-instruct:free"
        ],
        budgetTokens: 1500
    },
    planning: {
        capability: "planning",
        models: [
            "google/gemma-2-9b-it:free",
            "qwen/qwen-2.5-7b-instruct:free"
        ],
        budgetTokens: 1500
    }
};
const AGENT_CAPABILITIES = {
    exploration: "planning",
    profile_and_evidence: "extraction",
    market_and_matching: "matching",
    training: "planning"
};
class BudgetExceededError extends Error {
    code = "budget_exceeded";
    constructor(capability, estimatedTokens, budgetTokens){
        super(`Estimated ${estimatedTokens} tokens exceed the ${capability} budget of ${budgetTokens}`);
        this.name = "BudgetExceededError";
    }
}
class ModelChainExhaustedError extends Error {
    code = "model_chain_exhausted";
    attempted;
    constructor(capability, attempted, cause){
        super(`OpenRouter chain for ${capability} was exhausted: ${cause}`);
        this.name = "ModelChainExhaustedError";
        this.attempted = attempted;
    }
}
class ModelRouter {
    chains;
    invoke;
    disabled;
    constructor(chains = CAPABILITY_CHAINS, invoke){
        this.chains = chains;
        this.invoke = invoke;
        this.disabled = new Map();
    }
    /** Drop models that preflight did not find in the OpenRouter catalog. */ preflight(catalog) {
        const removed = [];
        for (const chain of Object.values(this.chains)){
            for (const modelId of chain.models){
                if (!catalog.includes(modelId) && !this.disabled.has(modelId)) {
                    this.disabled.set(modelId, "absent from OpenRouter catalog");
                    removed.push(modelId);
                }
            }
        }
        return removed;
    }
    isAvailable(modelId) {
        return !this.disabled.has(modelId);
    }
    async complete(request) {
        const chain = this.chains[request.capability];
        if (request.estimatedTokens > chain.budgetTokens) {
            throw new BudgetExceededError(request.capability, request.estimatedTokens, chain.budgetTokens);
        }
        const fallbacks = [];
        const attempted = [];
        let previous = null;
        let lastError = "no model available";
        for (const modelId of chain.models){
            if (this.disabled.has(modelId)) {
                previous = modelId;
                continue;
            }
            if (previous) fallbacks.push({
                from: previous,
                to: modelId
            });
            attempted.push(modelId);
            try {
                const result = await this.invoke(modelId, request.prompt);
                return {
                    modelId,
                    text: result.text,
                    fallbacks,
                    capability: request.capability
                };
            } catch (error) {
                lastError = error instanceof Error ? error.message : "model call failed";
                this.disabled.set(modelId, lastError);
                previous = modelId;
            }
        }
        throw new ModelChainExhaustedError(request.capability, attempted, lastError);
    }
}
function estimateTokens(prompt) {
    return Math.max(1, Math.ceil(prompt.length / 4));
}
function createOpenRouterClient(options) {
    const baseUrl = options.baseUrl ?? "https://openrouter.ai/api/v1";
    return {
        async catalog () {
            const response = await options.fetchImpl(`${baseUrl}/models`, {
                headers: {
                    Authorization: `Bearer ${options.apiKey}`
                }
            });
            if (!response.ok) {
                throw new Error(`OpenRouter preflight failed: ${response.status}`);
            }
            const body = await response.json();
            return (body.data ?? []).flatMap((model)=>model.id ? [
                    model.id
                ] : []);
        },
        async complete (modelId, prompt) {
            const response = await options.fetchImpl(`${baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${options.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: 256
                })
            });
            const body = await response.json();
            if (!response.ok) {
                throw new Error(body.error?.message ?? `OpenRouter completion failed: ${response.status}`);
            }
            const text = body.choices?.[0]?.message?.content;
            if (!text) throw new Error(`OpenRouter model ${modelId} returned an empty completion`);
            return {
                text
            };
        }
    };
}
}),
"[project]/apps/agent-runtime/src/workflow/observability.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppendOnlyAuditLog",
    ()=>AppendOnlyAuditLog,
    "DqlStore",
    ()=>DqlStore,
    "InvalidDqlTransitionError",
    ()=>InvalidDqlTransitionError,
    "LangfuseRecorder",
    ()=>LangfuseRecorder,
    "createLangfuseClient",
    ()=>createLangfuseClient
]);
const TRANSITIONS = {
    pending: [
        "success",
        "failed",
        "rejected",
        "retrying"
    ],
    failed: [
        "retrying",
        "dead_letter"
    ],
    retrying: [
        "success",
        "failed",
        "dead_letter"
    ],
    success: [],
    rejected: [],
    dead_letter: []
};
class InvalidDqlTransitionError extends Error {
    constructor(id, from, to){
        super(`DQL ${id} cannot move from ${from} to ${to}`);
        this.name = "InvalidDqlTransitionError";
    }
}
class AppendOnlyAuditLog {
    events = [];
    append(draft) {
        const stored = Object.freeze({
            ...draft,
            sequence: this.events.length + 1
        });
        this.events.push(stored);
        return stored;
    }
    read() {
        return this.events;
    }
}
class DqlStore {
    records = new Map();
    enqueue(id, traceId, at, reason = "accepted") {
        if (this.records.has(id)) {
            throw new Error(`DQL event ${id} already exists`);
        }
        const record = {
            id,
            traceId,
            state: "pending",
            history: [
                {
                    state: "pending",
                    reason,
                    at
                }
            ]
        };
        this.records.set(id, record);
        return this.snapshot(record);
    }
    transition(id, next, reason, at) {
        const record = this.records.get(id);
        if (!record) throw new Error(`DQL event ${id} does not exist`);
        if (!TRANSITIONS[record.state].includes(next)) {
            throw new InvalidDqlTransitionError(id, record.state, next);
        }
        record.state = next;
        record.history.push({
            state: next,
            reason,
            at
        });
        return this.snapshot(record);
    }
    list(traceId) {
        const records = [
            ...this.records.values()
        ];
        const selected = traceId ? records.filter((record)=>record.traceId === traceId) : records;
        return selected.map((record)=>this.snapshot(record));
    }
    snapshot(record) {
        return {
            id: record.id,
            traceId: record.traceId,
            state: record.state,
            history: record.history.map((entry)=>({
                    ...entry
                }))
        };
    }
}
class LangfuseRecorder {
    traces = new Map();
    spans = [];
    startTrace(trace) {
        this.traces.set(trace.id, trace);
    }
    startSpan(span) {
        const stored = {
            ...span,
            level: span.level ?? "DEFAULT",
            metadata: {
                ...span.metadata,
                trace_id: span.traceId
            }
        };
        this.spans.push(stored);
        return stored;
    }
    endSpan(spanId, update) {
        const span = this.spans.find((item)=>item.id === spanId);
        if (!span) throw new Error(`Langfuse span ${spanId} does not exist`);
        span.endTime = update.endTime;
        span.output = update.output;
        if (update.level) span.level = update.level;
        if (update.metadata) span.metadata = {
            ...span.metadata,
            ...update.metadata,
            trace_id: span.traceId
        };
        return span;
    }
    tracesFor(traceId) {
        return {
            trace: this.traces.get(traceId),
            spans: this.spans.filter((span)=>span.traceId === traceId)
        };
    }
    /** Langfuse ingestion batch. The in-memory recorder is the sink used in tests and local runs. */ flushed = null;
    /** Build the ingestion batch and keep it so a run can prove the flush happened. */ flush() {
        this.flushed = this.toIngestionBatch();
        return this.flushed;
    }
    lastBatch() {
        return this.flushed;
    }
    toIngestionBatch() {
        const batch = [];
        for (const trace of this.traces.values()){
            batch.push({
                id: trace.id,
                type: "trace-create",
                timestamp: trace.timestamp,
                body: trace
            });
        }
        for (const span of this.spans){
            batch.push({
                id: span.id,
                type: "span-create",
                timestamp: span.startTime,
                body: span
            });
        }
        return {
            batch
        };
    }
}
function createLangfuseClient(options) {
    const baseUrl = options.baseUrl ?? "https://cloud.langfuse.com";
    const token = Buffer.from(`${options.publicKey}:${options.secretKey ?? ""}`).toString("base64");
    return {
        async ingest (batch) {
            const response = await options.fetchImpl(`${baseUrl}/api/public/ingestion`, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(batch)
            });
            if (!response.ok) {
                throw new Error(`Langfuse ingestion failed: ${response.status}`);
            }
        }
    };
}
}),
"[project]/apps/agent-runtime/src/workflow/transport.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "encodeSseEvent",
    ()=>encodeSseEvent,
    "handleWorkflowRequest",
    ()=>handleWorkflowRequest
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/ajv.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$workflow$2f$graph$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/workflow/graph.ts [app-route] (ecmascript)");
;
;
function encodeSseEvent(event, data) {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
function header(headers, name) {
    if (!headers) return "";
    const match = Object.entries(headers).find(([key])=>key.toLowerCase() === name);
    return match?.[1] ?? "";
}
function json(status, payload) {
    return {
        status,
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(payload)
    };
}
async function handleWorkflowRequest(runtime, request) {
    if (request.path !== "/internal/workflow/runs") {
        return json(404, {
            code: "not_found"
        });
    }
    if (request.method !== "POST") {
        return json(405, {
            code: "method_not_allowed"
        });
    }
    try {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertWorkflowRun"])(request.body);
    } catch (error) {
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AjvValidationError"]) {
            return json(400, {
                code: "invalid_schema",
                message: error.message
            });
        }
        throw error;
    }
    const body = request.body;
    if (header(request.headers, "accept").includes("text/event-stream")) {
        return {
            status: 200,
            headers: {
                "content-type": "text/event-stream"
            },
            body: new ReadableStream({
                async start (controller) {
                    const encoder = new TextEncoder();
                    try {
                        const result = await runtime.run(body, {
                            onEvent (event) {
                                controller.enqueue(encoder.encode(encodeSseEvent(event.event, event.data)));
                            }
                        });
                        controller.enqueue(encoder.encode(encodeSseEvent("result", result)));
                        controller.close();
                    } catch (error) {
                        controller.error(error);
                    }
                }
            })
        };
    }
    try {
        return json(200, await runtime.run(body));
    } catch (error) {
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AjvValidationError"]) {
            return json(400, {
                code: "invalid_schema",
                message: error.message
            });
        }
        throw error;
    }
}
;
}),
"[project]/apps/web/app/api/intake/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "dynamic",
    ()=>dynamic,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$intake$2d$handler$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/intake-handler.ts [app-route] (ecmascript)");
;
;
;
const runtime = 'nodejs';
const dynamic = 'force-dynamic';
async function POST(request) {
    let payload;
    try {
        payload = await request.json();
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'invalid_json'
        }, {
            status: 400
        });
    }
    // With no OPENROUTER_API_KEY this resolves to the deterministic heuristic
    // extractor; the profile is still schema-valid either way.
    const { agent } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAgentFromEnv"])({
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
        OPENROUTER_VISION_MODEL: process.env.OPENROUTER_VISION_MODEL,
        OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL
    });
    const { status, body } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$intake$2d$handler$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleIntake"])(payload, {
        agent
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(body, {
        status
    });
}
}),
"[project]/apps/web/lib/intake-handler.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "handleIntake",
    ()=>handleIntake
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ids$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/ids.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$validators$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/validators.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$profile$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/agent-runtime/src/profile-agent.ts [app-route] (ecmascript)");
;
;
function decodeBase64(value) {
    return new Uint8Array(Buffer.from(value, 'base64'));
}
async function handleIntake(payload, deps = {}) {
    const validation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$validators$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateIntakeRequest"])(payload);
    if (!validation.valid) {
        return {
            status: 400,
            body: {
                error: 'invalid_intake_request',
                details: validation.errors
            }
        };
    }
    const request = payload;
    const traceId = request.traceId ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ids$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeTraceId"])(JSON.stringify([
        request.kind,
        request.fileName ?? '',
        (request.text ?? '').slice(0, 64)
    ]));
    const raw = {
        kind: request.kind,
        ref: request.fileName ? `intake:${request.fileName}` : `intake:${request.kind}`,
        mimeType: request.mimeType,
        text: request.text,
        altText: request.altText
    };
    if (request.kind === 'pdf' || request.kind === 'image') {
        raw.bytes = decodeBase64(request.contentBase64 ?? '');
    }
    const agent = deps.agent ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$agent$2d$runtime$2f$src$2f$profile$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProfileAgent"])({
        now: deps.now
    });
    try {
        const result = await agent.run(raw, {
            traceId,
            targetRoles: request.targetRoles,
            candidateId: request.candidateId,
            locale: request.locale
        });
        return {
            status: 200,
            body: result
        };
    } catch (error) {
        return {
            status: 422,
            body: {
                error: 'intake_failed',
                message: error instanceof Error ? error.message : String(error),
                trace_id: traceId
            }
        };
    }
}
}),
"[project]/packages/domain/src/ajv.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AGENT_ENVELOPE_SCHEMA_ID",
    ()=>AGENT_ENVELOPE_SCHEMA_ID,
    "AjvValidationError",
    ()=>AjvValidationError,
    "SCHEMA_ID",
    ()=>SCHEMA_ID,
    "SCHEMA_VERSION",
    ()=>SCHEMA_VERSION,
    "WORKFLOW_RUN_SCHEMA_ID",
    ()=>WORKFLOW_RUN_SCHEMA_ID,
    "ajv",
    ()=>ajv,
    "assertAgentEnvelope",
    ()=>assertAgentEnvelope,
    "assertJobRequirements",
    ()=>assertJobRequirements,
    "assertWorkflowRun",
    ()=>assertWorkflowRun,
    "validateAgentEnvelope",
    ()=>validateAgentEnvelope,
    "validateJobRequirements",
    ()=>validateJobRequirements,
    "validateWorkflowRun",
    ()=>validateWorkflowRun
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2f$dist$2f$2020$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ajv/dist/2020.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2d$formats$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ajv-formats/dist/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$agent$2d$envelope$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/agent-envelope.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$job$2d$requirements$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/job-requirements.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$workflow$2d$run$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/workflow-run.schema.json.[json].cjs [app-route] (ecmascript)");
;
;
;
;
;
const SCHEMA_ID = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$job$2d$requirements$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].$id;
const SCHEMA_VERSION = "1.0.0";
const ajv = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2f$dist$2f$2020$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]({
    allErrors: true,
    strict: true,
    allowUnionTypes: true
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2d$formats$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(ajv);
const validateJobRequirements = ajv.compile(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$job$2d$requirements$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]);
class AjvValidationError extends Error {
    errors;
    constructor(contract, errors){
        super(`Invalid ${contract}: ${(errors ?? []).map((error)=>`${error.instancePath || "/"} ${error.message ?? "is invalid"}`).join("; ")}`);
        this.name = "AjvValidationError";
        this.errors = errors;
    }
}
function assertJobRequirements(value) {
    if (!validateJobRequirements(value)) {
        throw new AjvValidationError("JobRequirements", validateJobRequirements.errors);
    }
}
const AGENT_ENVELOPE_SCHEMA_ID = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$agent$2d$envelope$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].$id;
const WORKFLOW_RUN_SCHEMA_ID = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$workflow$2d$run$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].$id;
const validateAgentEnvelope = ajv.compile(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$agent$2d$envelope$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]);
const validateWorkflowRun = ajv.compile(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$workflow$2d$run$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]);
function assertAgentEnvelope(value) {
    if (!validateAgentEnvelope(value)) {
        throw new AjvValidationError("AgentEnvelope", validateAgentEnvelope.errors);
    }
}
function assertWorkflowRun(value) {
    if (!validateWorkflowRun(value)) {
        throw new AjvValidationError("WorkflowRunRequest", validateWorkflowRun.errors);
    }
}
}),
"[project]/packages/domain/src/constants.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CONFIDENCE_BY_PROVENANCE",
    ()=>CONFIDENCE_BY_PROVENANCE,
    "DECLARED_ONLY_MAX_LEVEL",
    ()=>DECLARED_ONLY_MAX_LEVEL,
    "DEFAULT_EXPERIENCE_CONFIDENCE",
    ()=>DEFAULT_EXPERIENCE_CONFIDENCE,
    "DEFAULT_LOCALE",
    ()=>DEFAULT_LOCALE,
    "LEVEL_BEYOND_BASIC_PROVENANCE",
    ()=>LEVEL_BEYOND_BASIC_PROVENANCE,
    "MIN_CONFIDENCE",
    ()=>MIN_CONFIDENCE,
    "MIN_EXPERIENCE_DESCRIPTION_CHARS",
    ()=>MIN_EXPERIENCE_DESCRIPTION_CHARS,
    "PROFILE_SCHEMA_VERSION",
    ()=>PROFILE_SCHEMA_VERSION,
    "PROVENANCE_RANK",
    ()=>PROVENANCE_RANK,
    "RELEVANCE_THRESHOLDS",
    ()=>RELEVANCE_THRESHOLDS,
    "SKILL_LEVEL_MAX",
    ()=>SKILL_LEVEL_MAX,
    "SKILL_LEVEL_MIN",
    ()=>SKILL_LEVEL_MIN
]);
const PROVENANCE_RANK = {
    declared: 0,
    inferred: 1,
    extracted: 2,
    verified: 3
};
const LEVEL_BEYOND_BASIC_PROVENANCE = [
    'extracted',
    'verified'
];
const DECLARED_ONLY_MAX_LEVEL = 1;
const CONFIDENCE_BY_PROVENANCE = {
    verified: 0.95,
    extracted: 0.75,
    inferred: 0.5,
    declared: 0.55
};
const MIN_CONFIDENCE = 0.3;
const DEFAULT_EXPERIENCE_CONFIDENCE = 0.5;
const SKILL_LEVEL_MIN = 0;
const SKILL_LEVEL_MAX = 4;
const RELEVANCE_THRESHOLDS = {
    relevant: 0.5,
    partial: 0.2
};
const DEFAULT_LOCALE = 'es-PA';
const PROFILE_SCHEMA_VERSION = '1.0.0';
const MIN_EXPERIENCE_DESCRIPTION_CHARS = 25;
}),
"[project]/packages/domain/src/ids.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Deterministic identifier helpers.
 *
 * Ids must be stable across runs so classification, dedup and tie-breaking are
 * reproducible and testable. We use FNV-1a (32-bit) over a seed string and
 * prefix the result with a short type tag.
 */ __turbopack_context__.s([
    "fnv1a",
    ()=>fnv1a,
    "makeCandidateId",
    ()=>makeCandidateId,
    "makeId",
    ()=>makeId,
    "makeTraceId",
    ()=>makeTraceId
]);
function fnv1a(input) {
    let hash = 0x811c9dc5;
    for(let index = 0; index < input.length; index += 1){
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
function makeId(prefix, seed) {
    const safePrefix = prefix.replace(/[^A-Za-z0-9_.:-]/g, '');
    return `${safePrefix}_${fnv1a(seed)}`;
}
function makeTraceId(seed) {
    return makeId('trace', seed);
}
function makeCandidateId(seed) {
    return makeId('candidate', seed);
}
}),
"[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "matchSkill",
    ()=>matchSkill
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$validators$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/validators.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/skills.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$roles$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/roles.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ajv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/ajv.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
function matchSkill(text) {
    const canonical = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["matchVacancySkill"])(text);
    const legacy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["matchSkill"])(text)?.skill;
    return {
        ...canonical,
        skill: legacy ?? {
            skill_id: canonical.skillId ?? '',
            canonical_name: canonical.labelEn ?? canonical.labelEs ?? '',
            kind: 'technical',
            synonyms: []
        }
    };
}
;
}),
"[project]/packages/domain/src/taxonomy.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PANAMA_SKILL_TAXONOMY",
    ()=>PANAMA_SKILL_TAXONOMY,
    "matchVacancySkill",
    ()=>matchVacancySkill,
    "normalizeText",
    ()=>normalizeText
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$panama$2d$skills$2e$taxonomy$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/panama-skills.taxonomy.json.[json].cjs [app-route] (ecmascript)");
;
const PANAMA_SKILL_TAXONOMY = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$panama$2d$skills$2e$taxonomy$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"];
/** Qualifiers that describe a proficiency level, not the skill identity. */ const QUALIFIER_TOKENS = new Set([
    "nivel",
    "n0",
    "n1",
    "n2",
    "n3",
    "n4",
    "0",
    "1",
    "2",
    "3",
    "4",
    "basico",
    "basica",
    "intermedio",
    "intermedia",
    "avanzado",
    "avanzada",
    "experto",
    "experta",
    "principiante",
    "a1",
    "a2",
    "b1",
    "b2",
    "c1",
    "c2"
]);
/** Stop words that carry no skill signal in Spanish/English job ads. */ const STOP_WORDS = new Set([
    "de",
    "del",
    "la",
    "el",
    "los",
    "las",
    "un",
    "una",
    "unos",
    "unas",
    "y",
    "e",
    "o",
    "u",
    "en",
    "con",
    "a",
    "al",
    "para",
    "por",
    "the",
    "of",
    "and",
    "or",
    "in",
    "with",
    "to",
    "for"
]);
function normalizeText(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
function stripNoise(normalized) {
    return normalized.split(" ").filter((token)=>token.length > 0).filter((token)=>!STOP_WORDS.has(token) && !QUALIFIER_TOKENS.has(token)).join(" ");
}
function tokens(normalized) {
    return new Set(normalized.split(" ").filter(Boolean));
}
function tokenSetJaccard(a, b) {
    const setA = tokens(a);
    const setB = tokens(b);
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const token of setA){
        if (setB.has(token)) intersection += 1;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}
/** 0.9 when one normalized phrase contains the other as a whole-word run. */ function phraseContainment(a, b) {
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length <= b.length ? b : a;
    if (shorter.length < 5) return 0;
    const paddedLonger = ` ${longer} `;
    return paddedLonger.includes(` ${shorter} `) ? 0.9 : 0;
}
function buildMatch(skill, strategy, confidence, taxonomy) {
    return {
        matched: true,
        skillId: skill.id,
        labelEs: skill.labelEs,
        labelEn: skill.labelEn,
        escoLabel: skill.escoLabel,
        escoUri: skill.escoUri,
        taxonomyVersion: taxonomy.version,
        matchConfidence: Number(confidence.toFixed(2)),
        matchStrategy: strategy
    };
}
function unmatched(taxonomy) {
    return {
        matched: false,
        skillId: null,
        labelEs: null,
        labelEn: null,
        escoLabel: null,
        escoUri: null,
        taxonomyVersion: taxonomy.version,
        matchConfidence: 0,
        matchStrategy: "none"
    };
}
const FUZZY_THRESHOLD = 0.8;
function matchVacancySkill(text, taxonomy = PANAMA_SKILL_TAXONOMY) {
    const normalized = normalizeText(text);
    if (!normalized) return unmatched(taxonomy);
    const stripped = stripNoise(normalized);
    for (const skill of taxonomy.skills){
        for (const label of [
            skill.labelEs,
            skill.labelEn
        ]){
            const normalizedLabel = normalizeText(label);
            if (normalizedLabel && (normalized === normalizedLabel || stripped === normalizedLabel)) {
                return buildMatch(skill, "exact", 1, taxonomy);
            }
        }
    }
    for (const skill of taxonomy.skills){
        for (const alias of skill.aliases){
            const normalizedAlias = normalizeText(alias);
            if (normalizedAlias && (normalized === normalizedAlias || stripped === normalizedAlias)) {
                return buildMatch(skill, "alias", 1, taxonomy);
            }
        }
    }
    let best = null;
    for (const skill of taxonomy.skills){
        const candidates = [
            skill.labelEs,
            skill.labelEn,
            ...skill.aliases
        ].map(normalizeText).map(stripNoise).filter((candidate)=>candidate.length > 0);
        for (const candidate of candidates){
            const score = Math.max(tokenSetJaccard(stripped, candidate), phraseContainment(stripped, candidate));
            if (score >= FUZZY_THRESHOLD && (best === null || score > best.confidence)) {
                best = {
                    skill,
                    confidence: score
                };
            }
        }
    }
    return best ? buildMatch(best.skill, "fuzzy", best.confidence, taxonomy) : unmatched(taxonomy);
}
}),
"[project]/packages/domain/src/taxonomy/roles.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ROLE_BY_ID",
    ()=>ROLE_BY_ID,
    "ROLE_CATALOG",
    ()=>ROLE_CATALOG,
    "relevantSkillIds",
    ()=>relevantSkillIds,
    "resolveTargetRoles",
    ()=>resolveTargetRoles
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/skills.ts [app-route] (ecmascript)");
;
const ROLE_CATALOG = [
    {
        role_id: 'plp:role:soporte-tecnico',
        name: 'Soporte técnico',
        keywords: [
            'soporte tecnico',
            'soporte',
            'tecnico',
            'help desk',
            'mesa de ayuda',
            'it support',
            'tecnologia'
        ],
        skill_ids: [
            'plp:customer-support-tools',
            'plp:hardware-troubleshooting',
            'plp:windows',
            'plp:networking-basics',
            'plp:communication',
            'plp:problem-solving'
        ]
    },
    {
        role_id: 'plp:role:atencion-cliente',
        name: 'Atención al cliente',
        keywords: [
            'atencion al cliente',
            'servicio al cliente',
            'call center',
            'customer service',
            'atencion al publico',
            'ventas'
        ],
        skill_ids: [
            'plp:customer-service',
            'plp:communication',
            'plp:point-of-sale',
            'plp:responsibility',
            'plp:teamwork'
        ]
    },
    {
        role_id: 'plp:role:asistente-administrativo',
        name: 'Asistente administrativo',
        keywords: [
            'asistente administrativo',
            'administrativo',
            'asistente',
            'secretaria',
            'oficina',
            'administracion',
            'recepcionista'
        ],
        skill_ids: [
            'plp:office-suite',
            'plp:excel',
            'plp:word',
            'plp:data-entry',
            'plp:organization',
            'plp:attention-to-detail',
            'plp:responsibility'
        ]
    }
];
const ROLE_BY_ID = new Map(ROLE_CATALOG.map((role)=>[
        role.role_id,
        role
    ]));
function resolveTargetRoles(targetRoles) {
    if (!targetRoles || targetRoles.length === 0) return [];
    const resolved = new Map();
    for (const target of targetRoles){
        const needle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeTerm"])(target);
        if (!needle) continue;
        const direct = ROLE_CATALOG.find((role)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeTerm"])(role.name) === needle);
        if (direct) {
            resolved.set(direct.role_id, direct);
            continue;
        }
        for (const role of ROLE_CATALOG){
            if (role.keywords.some((keyword)=>needle.includes(keyword) || keyword.includes(needle))) {
                resolved.set(role.role_id, role);
            }
        }
    }
    return [
        ...resolved.values()
    ].sort((a, b)=>a.role_id.localeCompare(b.role_id));
}
function relevantSkillIds(roles) {
    const ids = new Set();
    for (const role of roles)for (const skillId of role.skill_ids)ids.add(skillId);
    return ids;
}
}),
"[project]/packages/domain/src/taxonomy/skills.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SKILL_TAXONOMY",
    ()=>SKILL_TAXONOMY,
    "TAXONOMY_BY_ID",
    ()=>TAXONOMY_BY_ID,
    "matchMentions",
    ()=>matchMentions,
    "matchSkill",
    ()=>matchSkill,
    "normalizeTerm",
    ()=>normalizeTerm
]);
const SKILL_TAXONOMY = [
    {
        skill_id: 'plp:excel',
        canonical_name: 'Excel',
        kind: 'technical',
        synonyms: [
            'excel',
            'hoja de calculo',
            'hojas de calculo',
            'planillas',
            'spreadsheet'
        ],
        esco_reference: 'spreadsheet software'
    },
    {
        skill_id: 'plp:word',
        canonical_name: 'Word',
        kind: 'technical',
        synonyms: [
            'word',
            'procesador de texto',
            'word processor'
        ],
        esco_reference: 'word processing software'
    },
    {
        skill_id: 'plp:office-suite',
        canonical_name: 'Ofimática',
        kind: 'technical',
        synonyms: [
            'ofimatica',
            'office',
            'microsoft office',
            'paquete office',
            'office 365',
            'msoffice'
        ],
        esco_reference: 'office suite software'
    },
    {
        skill_id: 'plp:data-entry',
        canonical_name: 'Digitación de datos',
        kind: 'technical',
        synonyms: [
            'digitacion',
            'digitacion de datos',
            'data entry',
            'ingreso de datos',
            'transcripcion de datos',
            'tipeo'
        ],
        esco_reference: 'data entry'
    },
    {
        skill_id: 'plp:point-of-sale',
        canonical_name: 'Punto de venta y caja',
        kind: 'technical',
        synonyms: [
            'caja',
            'cajero',
            'cajera',
            'punto de venta',
            'pos',
            'cash register',
            'manejo de caja',
            'facturacion'
        ],
        esco_reference: 'point of sale operation'
    },
    {
        skill_id: 'plp:inventory',
        canonical_name: 'Control de inventario',
        kind: 'technical',
        synonyms: [
            'inventario',
            'control de inventario',
            'inventory',
            'stock',
            'bodega'
        ],
        esco_reference: 'inventory management'
    },
    {
        skill_id: 'plp:customer-support-tools',
        canonical_name: 'Herramientas de soporte (mesa de ayuda)',
        kind: 'technical',
        synonyms: [
            'mesa de ayuda',
            'help desk',
            'service desk',
            'ticketing',
            'zendesk',
            'soporte tecnico',
            'helpdesk'
        ],
        esco_reference: 'help desk support'
    },
    {
        skill_id: 'plp:networking-basics',
        canonical_name: 'Redes básicas',
        kind: 'technical',
        synonyms: [
            'redes',
            'red',
            'networking',
            'cableado estructurado',
            'cableado de red',
            'lan',
            'wifi'
        ],
        esco_reference: 'computer network configuration'
    },
    {
        skill_id: 'plp:hardware-troubleshooting',
        canonical_name: 'Diagnóstico de hardware',
        kind: 'technical',
        synonyms: [
            'hardware',
            'mantenimiento de computadoras',
            'mantenimiento de equipos',
            'reparacion de pc',
            'reparacion de computadoras',
            'computadoras',
            'computadora',
            'pc',
            'equipos de computo',
            'diagnostico de equipos',
            'troubleshooting'
        ],
        esco_reference: 'hardware troubleshooting'
    },
    {
        skill_id: 'plp:windows',
        canonical_name: 'Windows',
        kind: 'technical',
        synonyms: [
            'windows',
            'sistema operativo windows',
            'windows 10',
            'windows 11'
        ],
        esco_reference: 'operating systems'
    },
    {
        skill_id: 'plp:sql',
        canonical_name: 'Bases de datos y SQL',
        kind: 'technical',
        synonyms: [
            'sql',
            'base de datos',
            'bases de datos',
            'database',
            'mysql',
            'postgres',
            'postgresql'
        ],
        esco_reference: 'database management'
    },
    {
        skill_id: 'plp:python',
        canonical_name: 'Python',
        kind: 'technical',
        synonyms: [
            'python'
        ],
        esco_reference: 'python programming'
    },
    {
        skill_id: 'plp:javascript',
        canonical_name: 'JavaScript',
        kind: 'technical',
        synonyms: [
            'javascript',
            'js',
            'typescript',
            'node'
        ],
        esco_reference: 'javascript programming'
    },
    {
        skill_id: 'plp:social-media',
        canonical_name: 'Gestión de redes sociales',
        kind: 'technical',
        synonyms: [
            'redes sociales',
            'social media',
            'community management',
            'manejo de redes',
            'instagram',
            'facebook'
        ],
        esco_reference: 'social media management'
    },
    {
        skill_id: 'plp:graphic-design',
        canonical_name: 'Diseño gráfico',
        kind: 'technical',
        synonyms: [
            'diseno grafico',
            'diseño grafico',
            'photoshop',
            'illustrator',
            'canva',
            'figma',
            'diseno'
        ],
        esco_reference: 'graphic design'
    },
    {
        skill_id: 'plp:driving-license',
        canonical_name: 'Licencia de conducir',
        kind: 'technical',
        synonyms: [
            'licencia de conducir',
            'licencia de manejo',
            'licencia de automovil',
            'driver license',
            'licencia tipo'
        ],
        esco_reference: 'driving licence'
    },
    {
        skill_id: 'plp:customer-service',
        canonical_name: 'Atención al cliente',
        kind: 'soft',
        synonyms: [
            'atencion al cliente',
            'atención al cliente',
            'atencion al publico',
            'servicio al cliente',
            'customer service',
            'trato con clientes',
            'orientacion al cliente'
        ],
        esco_reference: 'customer service'
    },
    {
        skill_id: 'plp:communication',
        canonical_name: 'Comunicación',
        kind: 'soft',
        synonyms: [
            'comunicacion',
            'comunicación',
            'communication',
            'comunicacion efectiva',
            'expresion oral'
        ],
        esco_reference: 'communication'
    },
    {
        skill_id: 'plp:teamwork',
        canonical_name: 'Trabajo en equipo',
        kind: 'soft',
        synonyms: [
            'trabajo en equipo',
            'teamwork',
            'colaboracion',
            'colaboración',
            'equipo de trabajo'
        ],
        esco_reference: 'teamwork'
    },
    {
        skill_id: 'plp:problem-solving',
        canonical_name: 'Resolución de problemas',
        kind: 'soft',
        synonyms: [
            'resolucion de problemas',
            'resolución de problemas',
            'problem solving',
            'solucion de problemas',
            'pensamiento critico'
        ],
        esco_reference: 'problem solving'
    },
    {
        skill_id: 'plp:responsibility',
        canonical_name: 'Responsabilidad',
        kind: 'soft',
        synonyms: [
            'responsabilidad',
            'responsable',
            'puntualidad',
            'cumplimiento',
            'compromiso'
        ],
        esco_reference: 'reliability'
    },
    {
        skill_id: 'plp:adaptability',
        canonical_name: 'Adaptabilidad',
        kind: 'soft',
        synonyms: [
            'adaptabilidad',
            'adaptable',
            'flexibilidad',
            'flexible'
        ],
        esco_reference: 'adaptability'
    },
    {
        skill_id: 'plp:leadership',
        canonical_name: 'Liderazgo',
        kind: 'soft',
        synonyms: [
            'liderazgo',
            'leadership',
            'supervision de personal',
            'supervisión',
            'jefe de grupo'
        ],
        esco_reference: 'leadership'
    },
    {
        skill_id: 'plp:organization',
        canonical_name: 'Organización',
        kind: 'soft',
        synonyms: [
            'organizacion',
            'organización',
            'planificacion',
            'planificación',
            'gestion del tiempo',
            'organizado'
        ],
        esco_reference: 'time management'
    },
    {
        skill_id: 'plp:attention-to-detail',
        canonical_name: 'Atención al detalle',
        kind: 'soft',
        synonyms: [
            'atencion al detalle',
            'atención al detalle',
            'detallista',
            'minucioso',
            'cuidadoso',
            'attention to detail'
        ],
        esco_reference: 'attention to detail'
    },
    {
        skill_id: 'plp:willingness-to-learn',
        canonical_name: 'Disposición para aprender',
        kind: 'soft',
        synonyms: [
            'disposicion para aprender',
            'disposición para aprender',
            'ganas de aprender',
            'aprendizaje rapido',
            'fast learner',
            'proactivo'
        ],
        esco_reference: 'willingness to learn'
    }
];
const TAXONOMY_BY_ID = new Map(SKILL_TAXONOMY.map((entry)=>[
        entry.skill_id,
        entry
    ]));
function normalizeTerm(value) {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
/** Synonym entries, longest key first so greedy matching prefers specific terms. */ const SYNONYM_ENTRIES = (()=>{
    const entries = [];
    const seen = new Set();
    for (const entry of SKILL_TAXONOMY){
        for (const term of [
            entry.canonical_name,
            ...entry.synonyms
        ]){
            const key = normalizeTerm(term);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            entries.push({
                key,
                skill: entry
            });
        }
    }
    return entries.sort((a, b)=>b.key.length - a.key.length || a.key.localeCompare(b.key));
})();
const SYNONYM_INDEX = new Map(SYNONYM_ENTRIES.map((entry)=>[
        entry.key,
        entry.skill
    ]));
/**
 * A synonym is only accepted as a substring match when it sits on word
 * boundaries, so `redaccion` never matches `red`.
 */ function findWholeWord(haystack, needle) {
    let from = 0;
    for(;;){
        const at = haystack.indexOf(needle, from);
        if (at === -1) return -1;
        const before = at === 0 ? ' ' : haystack[at - 1];
        const afterIndex = at + needle.length;
        const after = afterIndex >= haystack.length ? ' ' : haystack[afterIndex];
        if (before === ' ' && after === ' ') return at;
        from = at + 1;
    }
}
function matchSkill(term) {
    const key = normalizeTerm(term);
    if (!key) return undefined;
    const direct = SYNONYM_INDEX.get(key);
    if (direct) return {
        skill: direct,
        matchedTerm: key
    };
    const padded = ` ${key} `;
    for (const entry of SYNONYM_ENTRIES){
        if (entry.key.length < 4) continue;
        if (findWholeWord(padded, entry.key) !== -1) {
            return {
                skill: entry.skill,
                matchedTerm: entry.key
            };
        }
    }
    return undefined;
}
function matchMentions(text) {
    let haystack = ` ${normalizeTerm(text)} `;
    const seen = new Map();
    for (const entry of SYNONYM_ENTRIES){
        if (seen.has(entry.skill.skill_id)) continue;
        const at = findWholeWord(haystack, entry.key);
        if (at === -1) continue;
        seen.set(entry.skill.skill_id, {
            skill: entry.skill,
            matchedTerm: entry.key
        });
        // Mask the matched span so shorter overlapping synonyms cannot re-match it.
        haystack = haystack.slice(0, at) + ' '.repeat(entry.key.length) + haystack.slice(at + entry.key.length);
    }
    return [
        ...seen.values()
    ].sort((a, b)=>a.skill.skill_id.localeCompare(b.skill.skill_id));
}
}),
"[project]/packages/domain/src/taxonomy/skills.ts [app-route] (ecmascript) <export matchSkill as profileMatchSkill>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "profileMatchSkill",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["matchSkill"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/skills.ts [app-route] (ecmascript)");
}),
"[project]/packages/domain/src/validators.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ALL_SCHEMAS",
    ()=>ALL_SCHEMAS,
    "ContractValidationError",
    ()=>ContractValidationError,
    "SCHEMA_IDS",
    ()=>SCHEMA_IDS,
    "assertCandidateProfile",
    ()=>assertCandidateProfile,
    "assertIntakeRequest",
    ()=>assertIntakeRequest,
    "assertIntakeResult",
    ()=>assertIntakeResult,
    "assertProfileDraft",
    ()=>assertProfileDraft,
    "createAjv",
    ()=>createAjv,
    "validateCandidateProfile",
    ()=>validateCandidateProfile,
    "validateIntakeRequest",
    ()=>validateIntakeRequest,
    "validateIntakeResult",
    ()=>validateIntakeResult,
    "validateProfileDraft",
    ()=>validateProfileDraft
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2f$dist$2f$2020$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ajv/dist/2020.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2d$formats$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ajv-formats/dist/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$common$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/common.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$evidence$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/evidence.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$skill$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/skill.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$experience$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/experience.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$education$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/education.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$certification$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/certification.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$intake$2d$source$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/intake-source.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$candidate$2d$profile$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/candidate-profile.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$profile$2d$draft$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/profile-draft.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$intake$2d$request$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/intake-request.schema.json.[json].cjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$intake$2d$result$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/schemas/intake-result.schema.json.[json].cjs [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
const SCHEMA_IDS = {
    common: 'https://puente-laboral.pa/schemas/common/1.0.0',
    evidence: 'https://puente-laboral.pa/schemas/evidence/1.0.0',
    skill: 'https://puente-laboral.pa/schemas/skill/1.0.0',
    experience: 'https://puente-laboral.pa/schemas/experience/1.0.0',
    education: 'https://puente-laboral.pa/schemas/education/1.0.0',
    certification: 'https://puente-laboral.pa/schemas/certification/1.0.0',
    intakeSource: 'https://puente-laboral.pa/schemas/intake-source/1.0.0',
    candidateProfile: 'https://puente-laboral.pa/schemas/candidate-profile/1.0.0',
    profileDraft: 'https://puente-laboral.pa/schemas/profile-draft/1.0.0',
    intakeRequest: 'https://puente-laboral.pa/schemas/intake-request/1.0.0',
    intakeResult: 'https://puente-laboral.pa/schemas/intake-result/1.0.0'
};
const ALL_SCHEMAS = [
    __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$common$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"],
    __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$evidence$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"],
    __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$skill$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"],
    __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$experience$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"],
    __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$education$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"],
    __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$certification$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"],
    __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$intake$2d$source$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"],
    __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$candidate$2d$profile$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"],
    __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$profile$2d$draft$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"],
    __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$intake$2d$request$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"],
    __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$schemas$2f$intake$2d$result$2e$schema$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]
];
function createAjv() {
    const ajv = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2f$dist$2f$2020$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]({
        strict: true,
        // `if`/`then` branches intentionally re-`require` properties declared on the
        // root schema (e.g. `then: { required: ["text"] }`). That is valid JSON
        // Schema; Ajv's strictRequired is only a lint, so we relax just that rule.
        strictRequired: false,
        allErrors: true,
        allowUnionTypes: true
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ajv$2d$formats$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(ajv);
    for (const schema of ALL_SCHEMAS)ajv.addSchema(schema);
    return ajv;
}
let cachedAjv;
function ajv() {
    if (!cachedAjv) cachedAjv = createAjv();
    return cachedAjv;
}
let cachedValidators;
function validators() {
    if (!cachedValidators) {
        const instance = ajv();
        const built = new Map();
        for (const id of Object.values(SCHEMA_IDS)){
            const compiled = instance.getSchema(id);
            if (!compiled) throw new Error(`Schema not registered: ${id}`);
            built.set(id, compiled);
        }
        // Only publish the cache once every schema compiled, so a failure never
        // leaves a partially-populated map behind.
        cachedValidators = built;
    }
    return cachedValidators;
}
class ContractValidationError extends Error {
    contract;
    errors;
    constructor(contract, errors){
        super(`Invalid ${contract}: ${errors.join('; ')}`);
        this.name = 'ContractValidationError';
        this.contract = contract;
        this.errors = errors;
    }
}
function formatErrors(contract, errors) {
    return (errors ?? []).map((error)=>{
        const path = error.instancePath || '/';
        return `${contract}${path} ${error.message ?? 'is invalid'}`;
    });
}
function validateAgainst(contract, data) {
    const validate = validators().get(SCHEMA_IDS[contract]);
    if (!validate) throw new Error(`Unknown contract: ${contract}`);
    if (validate(data)) return {
        valid: true
    };
    return {
        valid: false,
        errors: formatErrors(contract, validate.errors)
    };
}
function validateCandidateProfile(data) {
    return validateAgainst('candidateProfile', data);
}
function validateIntakeRequest(data) {
    return validateAgainst('intakeRequest', data);
}
function validateProfileDraft(data) {
    return validateAgainst('profileDraft', data);
}
function validateIntakeResult(data) {
    return validateAgainst('intakeResult', data);
}
function assertCandidateProfile(data) {
    const result = validateCandidateProfile(data);
    if (!result.valid) throw new ContractValidationError('CandidateProfile', result.errors);
}
function assertIntakeRequest(data) {
    const result = validateIntakeRequest(data);
    if (!result.valid) throw new ContractValidationError('IntakeRequest', result.errors);
}
function assertProfileDraft(data) {
    const result = validateProfileDraft(data);
    if (!result.valid) throw new ContractValidationError('ProfileDraft', result.errors);
}
function assertIntakeResult(data) {
    const result = validateIntakeResult(data);
    if (!result.valid) throw new ContractValidationError('IntakeResult', result.errors);
}
}),
"[project]/packages/ingestion/src/errors.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IngestionError",
    ()=>IngestionError,
    "OcrUnavailableError",
    ()=>OcrUnavailableError,
    "SourceTooLargeError",
    ()=>SourceTooLargeError,
    "UnsupportedSourceError",
    ()=>UnsupportedSourceError
]);
class IngestionError extends Error {
    constructor(message){
        super(message);
        this.name = 'IngestionError';
    }
}
class UnsupportedSourceError extends IngestionError {
    constructor(message){
        super(message);
        this.name = 'UnsupportedSourceError';
    }
}
class SourceTooLargeError extends IngestionError {
    constructor(actualBytes, maxBytes){
        super(`Source is ${actualBytes} bytes, which exceeds the ${maxBytes}-byte limit`);
        this.name = 'SourceTooLargeError';
    }
}
class OcrUnavailableError extends IngestionError {
    constructor(){
        super('No OCR provider is available for image input. Provide `altText`, configure a vision adapter, or install tesseract.js.');
        this.name = 'OcrUnavailableError';
    }
}
}),
"[project]/packages/ingestion/src/extract.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "extractText",
    ()=>extractText
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$kinds$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ingestion/src/kinds.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ingestion/src/errors.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$ocr$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ingestion/src/ocr.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$pdf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ingestion/src/pdf.ts [app-route] (ecmascript)");
;
;
;
;
function requireBytes(raw, kind, maxBytes) {
    if (!raw.bytes || raw.bytes.byteLength === 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UnsupportedSourceError"](`Source of kind \`${kind}\` requires binary content`);
    }
    if (raw.bytes.byteLength > maxBytes) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SourceTooLargeError"](raw.bytes.byteLength, maxBytes);
    return raw.bytes;
}
function requireText(raw, kind) {
    const text = raw.text?.trim();
    if (!text) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UnsupportedSourceError"](`Source of kind \`${kind}\` requires inline text`);
    return text;
}
async function extractText(raw, deps = {}) {
    const now = deps.now ?? (()=>new Date());
    const maxBytes = deps.maxBytes ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$kinds$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_SOURCE_BYTES"];
    const maxChars = deps.maxChars ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$kinds$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_TEXT_CHARS"];
    const warnings = [];
    let text;
    let method;
    let confidence;
    let pageCount;
    let byteLength;
    switch(raw.kind){
        case 'text':
        case 'audio_transcript':
            {
                text = requireText(raw, raw.kind);
                method = 'passthrough';
                confidence = raw.kind === 'audio_transcript' ? 0.9 : 1;
                break;
            }
        case 'pdf':
            {
                const bytes = requireBytes(raw, raw.kind, maxBytes);
                byteLength = bytes.byteLength;
                const extractor = deps.pdf ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$pdf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["unpdfExtractor"];
                const result = await extractor(bytes);
                text = result.text.trim();
                pageCount = result.pageCount;
                method = deps.pdf ? 'pdf-adapter' : 'unpdf';
                confidence = 0.8;
                if (!text) warnings.push('PDF contained no extractable text; it may require OCR.');
                else if (text.length < 200) warnings.push('Very little text was extracted from the PDF; OCR quality may be an issue.');
                break;
            }
        case 'image':
            {
                const bytes = requireBytes(raw, raw.kind, maxBytes);
                byteLength = bytes.byteLength;
                // Vision first (when configured), then human alt text, then offline
                // tesseract. The chained adapter stops at the first non-empty result.
                const adapters = [];
                if (deps.ocr) adapters.push(deps.ocr);
                if (raw.altText?.trim()) adapters.push(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$ocr$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["altTextOcrAdapter"]);
                adapters.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$ocr$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["tesseractOcrAdapter"])());
                const adapter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$ocr$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["chainedOcrAdapter"])(adapters);
                const result = await adapter.extract({
                    bytes,
                    mimeType: raw.mimeType,
                    altText: raw.altText
                });
                text = result.text.trim();
                method = result.method;
                confidence = result.confidence;
                for (const warning of result.warnings ?? [])warnings.push(warning);
                if (!text) warnings.push('No text was extracted from the image; ask the candidate to correct it.');
                break;
            }
        default:
            {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UnsupportedSourceError"](`Unsupported intake source kind: ${String(raw.kind)}`);
            }
    }
    if (text.length > maxChars) {
        text = text.slice(0, maxChars);
        warnings.push(`Input text was truncated to ${maxChars} characters.`);
    }
    const source = {
        kind: raw.kind,
        ref: raw.ref,
        extraction_method: method,
        extracted_at: now().toISOString(),
        extracted_char_count: text.length
    };
    if (raw.mimeType) source.mime_type = raw.mimeType;
    if (byteLength !== undefined) source.byte_length = byteLength;
    if (pageCount !== undefined) source.page_count = pageCount;
    if (confidence < 1) source.extraction_confidence = confidence;
    if (warnings.length) source.warnings = [
        ...warnings
    ];
    return {
        text,
        source,
        warnings,
        confidence
    };
}
}),
"[project]/packages/ingestion/src/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$extract$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ingestion/src/extract.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$kinds$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ingestion/src/kinds.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$ocr$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ingestion/src/ocr.ts [app-route] (ecmascript)");
;
;
;
;
;
}),
"[project]/packages/ingestion/src/kinds.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MAX_SOURCE_BYTES",
    ()=>MAX_SOURCE_BYTES,
    "MAX_TEXT_CHARS",
    ()=>MAX_TEXT_CHARS,
    "detectSourceKind",
    ()=>detectSourceKind,
    "extensionOf",
    ()=>extensionOf
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ingestion/src/errors.ts [app-route] (ecmascript)");
;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 200_000;
const PDF_MIME = 'application/pdf';
const IMAGE_MIME_PREFIX = 'image/';
const IMAGE_EXTENSIONS = [
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.bmp',
    '.tif',
    '.tiff',
    '.heic'
];
function extensionOf(fileName) {
    if (!fileName) return '';
    const dot = fileName.lastIndexOf('.');
    return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
}
function detectSourceKind(input) {
    if (input.kind) return input.kind;
    const mimeType = input.mimeType?.toLowerCase() ?? '';
    const extension = extensionOf(input.fileName);
    if (mimeType === PDF_MIME || extension === '.pdf') return 'pdf';
    if (mimeType.startsWith(IMAGE_MIME_PREFIX) || IMAGE_EXTENSIONS.includes(extension)) return 'image';
    if (mimeType.startsWith('text/') || extension === '.txt' || extension === '.md') return 'text';
    throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UnsupportedSourceError"](`Cannot infer intake source kind from mimeType=${JSON.stringify(mimeType)} fileName=${JSON.stringify(input.fileName)}`);
}
}),
"[project]/packages/ingestion/src/ocr.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "altTextOcrAdapter",
    ()=>altTextOcrAdapter,
    "chainedOcrAdapter",
    ()=>chainedOcrAdapter,
    "tesseractOcrAdapter",
    ()=>tesseractOcrAdapter,
    "visionOcrAdapter",
    ()=>visionOcrAdapter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/ingestion/src/errors.ts [app-route] (ecmascript)");
;
const altTextOcrAdapter = {
    name: 'manual-transcription',
    async extract (request) {
        const text = request.altText?.trim();
        if (!text) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OcrUnavailableError"]();
        return {
            text,
            confidence: 0.6,
            method: 'manual-transcription'
        };
    }
};
function visionOcrAdapter(describer) {
    return {
        name: 'vision',
        async extract (request) {
            const { text, confidence } = await describer.describe({
                bytes: request.bytes,
                mimeType: request.mimeType
            });
            return {
                text: text.trim(),
                confidence: confidence ?? 0.75,
                method: 'vision'
            };
        }
    };
}
function tesseractOcrAdapter(langs = 'spa+eng') {
    return {
        name: 'tesseract',
        async extract (request) {
            const isPng = request.bytes.length >= 8 && request.bytes.slice(0, 8).every((byte, index)=>byte === [
                    137,
                    80,
                    78,
                    71,
                    13,
                    10,
                    26,
                    10
                ][index]);
            const isJpeg = request.bytes.length >= 3 && request.bytes[0] === 0xff && request.bytes[1] === 0xd8 && request.bytes[2] === 0xff;
            if (!isPng && !isJpeg) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OcrUnavailableError"]();
            let recognize;
            try {
                const moduleName = 'tesseract.js';
                const mod = await __turbopack_context__.A("[project]/apps/web/lib/optional/tesseract.ts [app-route] (ecmascript, async loader)");
                recognize = mod.recognize ?? mod.default?.recognize;
            } catch  {
                recognize = undefined;
            }
            if (!recognize) throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OcrUnavailableError"]();
            let result;
            try {
                result = await recognize(request.bytes, langs);
            } catch  {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OcrUnavailableError"]();
            }
            return {
                text: result.data.text.trim(),
                confidence: (result.data.confidence ?? 60) / 100,
                method: 'tesseract'
            };
        }
    };
}
function chainedOcrAdapter(adapters) {
    return {
        name: adapters.map((adapter)=>adapter.name).join('+'),
        async extract (request) {
            const errors = [];
            for (const adapter of adapters){
                try {
                    const result = await adapter.extract(request);
                    if (result.text) return result;
                } catch (error) {
                    errors.push(error);
                }
            }
            // Surface the first real failure (e.g. a vision-model error) instead of
            // masking it behind a later "OCR unavailable" result.
            const firstRealError = errors.find((error)=>!(error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OcrUnavailableError"]));
            throw firstRealError ?? new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$ingestion$2f$src$2f$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OcrUnavailableError"]();
        }
    };
}
}),
"[project]/packages/ingestion/src/pdf.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * PDF text extraction.
 *
 * The real implementation uses `unpdf` (Mozilla PDF.js, serverless build). The
 * extractor is injectable so unit tests never depend on a real PDF binary and
 * the web runtime can swap in another engine without touching callers.
 */ __turbopack_context__.s([
    "unpdfExtractor",
    ()=>unpdfExtractor
]);
const unpdfExtractor = async (bytes)=>{
    const { extractText, getDocumentProxy } = await __turbopack_context__.A("[externals]/unpdf [external] (unpdf, esm_import, [project]/node_modules/unpdf, async loader)");
    const pdf = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(pdf, {
        mergePages: true
    });
    const merged = Array.isArray(text) ? text.join('\n\n') : text;
    return {
        text: merged.trim(),
        pageCount: totalPages
    };
};
}),
"[project]/packages/profile/src/build-profile.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildProfile",
    ()=>buildProfile,
    "provenanceForIntakeKind",
    ()=>provenanceForIntakeKind
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$heuristic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/heuristic.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$normalize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/normalize.ts [app-route] (ecmascript)");
;
;
function provenanceForIntakeKind(kind) {
    return kind === 'pdf' || kind === 'image' ? 'extracted' : 'declared';
}
async function buildProfile(input, deps = {}) {
    const extractor = deps.extractor ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$heuristic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["heuristicProfileExtractor"];
    const outcome = await extractor.extract({
        text: input.text,
        sourceRef: input.source.ref,
        provenance: input.provenance,
        targetRoles: input.targetRoles,
        locale: input.locale
    });
    const draft = outcome.draft;
    const warnings = [
        ...input.warnings ?? [],
        ...input.source.warnings ?? []
    ];
    const profile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$normalize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeProfileDraft"])(draft, {
        traceId: input.traceId,
        sources: [
            input.source
        ],
        provenance: input.provenance,
        targetRoles: input.targetRoles,
        candidateId: input.candidateId,
        locale: input.locale,
        warnings,
        now: deps.now
    });
    const needsReview = (profile.warnings?.length ?? 0) > 0 || profile.experiences.some((experience)=>experience.relevance === 'requires_additional_evidence') || profile.skills.some((skill)=>skill.level === 0);
    return {
        trace_id: input.traceId,
        profile,
        extraction: {
            extractor: outcome.kind,
            needs_review: needsReview,
            warnings: profile.warnings ?? []
        }
    };
}
}),
"[project]/packages/profile/src/classify.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "classifyExperience",
    ()=>classifyExperience
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/constants.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/skills.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$roles$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/roles.ts [app-route] (ecmascript)");
;
const MAX_POINTS = 3;
function classifyExperience(input) {
    const description = input.description.trim();
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeTerm"])(description).length < __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MIN_EXPERIENCE_DESCRIPTION_CHARS"]) {
        return {
            relevance: 'requires_additional_evidence',
            score: 0,
            reason: 'The description is too short to classify; ask the candidate for more detail or evidence.'
        };
    }
    const relevant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$roles$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["relevantSkillIds"])(input.roles);
    const matched = [
        ...new Set(input.skillIds)
    ].filter((id)=>relevant.size === 0 ? true : relevant.has(id));
    if (matched.length === 0) {
        return {
            relevance: 'not_relevant',
            score: 0,
            reason: input.roles.length === 0 ? 'No recognizable skills were found in the description.' : `No overlap with the target roles (${input.roles.map((role)=>role.name).join(', ')}).`
        };
    }
    const coverage = relevant.size === 0 ? Math.min(1, matched.length / MAX_POINTS) : matched.length / relevant.size;
    const skillDepth = Math.min(1, matched.length / MAX_POINTS);
    const score = Number((0.6 * coverage + 0.4 * skillDepth).toFixed(4));
    const relevance = score >= __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RELEVANCE_THRESHOLDS"].relevant ? 'relevant' : score >= __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RELEVANCE_THRESHOLDS"].partial ? 'partially_relevant' : 'not_relevant';
    const roleLabel = input.roles.length ? input.roles.map((role)=>role.name).join(', ') : 'the general catalog';
    const reason = relevance === 'not_relevant' ? `Only weak overlap with ${roleLabel}.` : `Matches ${matched.length} skill(s) relevant to ${roleLabel}.`;
    return {
        relevance,
        score,
        reason
    };
}
}),
"[project]/packages/profile/src/experience-type.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ACADEMIC_WORK_TERMS",
    ()=>ACADEMIC_WORK_TERMS,
    "inferExperienceType",
    ()=>inferExperienceType
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/skills.ts [app-route] (ecmascript)");
;
const ACADEMIC_WORK_TERMS = [
    'tesis',
    'trabajo academico'
];
/** Venues that can indicate a family-run business, and whether the bare word is enough. */ const FAMILY_VENUES = [
    {
        term: 'tienda',
        standalone: false
    },
    {
        term: 'fonda',
        standalone: true
    },
    {
        term: 'kiosco',
        standalone: true
    },
    {
        term: 'minisuper',
        standalone: true
    },
    {
        term: 'abarroteria',
        standalone: true
    },
    {
        term: 'negocio',
        standalone: false
    }
];
/**
 * Venues that are ambiguous with formal work ("un puesto en la empresa"), so
 * they only count as family work when a possessive family phrase follows.
 */ const POSSESSIVE_FAMILY_VENUES = [
    'puesto',
    'comercio',
    'local'
];
/** Relations that point at the candidate's own family. */ const FAMILY_RELATIONS = [
    'familia',
    'familiar',
    'mi mama',
    'mi papa',
    'mi madre',
    'mi padre',
    'mis padres',
    'mi hermana',
    'mi hermano',
    'mi tia',
    'mi tio',
    'abuelo',
    'abuela'
];
/** Family nouns that may follow a possessive ("de mi mamá", "de la familia"). */ const FAMILY_NOUNS = [
    'familia',
    'mama',
    'papa',
    'madre',
    'padre',
    'hermana',
    'hermano',
    'tia',
    'tio',
    'padres',
    'abuelo',
    'abuela',
    'hijo',
    'hija'
];
const FAMILY_POSSESSIVE_PREFIXES = [
    'mi',
    'mis',
    'la'
];
/** Adjective phrases that already imply a family business on their own. */ const FAMILY_BUSINESS_PHRASES = [
    'negocio familiar',
    'tienda familiar',
    'puesto familiar',
    'comercio familiar',
    'local familiar'
];
const FAMILY_VENUE_TERMS = FAMILY_VENUES.map((venue)=>venue.term);
const STANDALONE_FAMILY_VENUE_TERMS = FAMILY_VENUES.filter((venue)=>venue.standalone).map((venue)=>venue.term);
/** Ordered keyword rules for an experience entry. First match wins. */ const EXPERIENCE_TYPE_RULES = [
    {
        type: 'family_business',
        keywords: [
            ...FAMILY_BUSINESS_PHRASES,
            ...STANDALONE_FAMILY_VENUE_TERMS
        ]
    },
    {
        type: 'volunteering',
        keywords: [
            'voluntari',
            'voluntario',
            'voluntaria',
            'trabajo comunitario',
            'iglesia',
            'grupo juvenil'
        ]
    },
    {
        type: 'internship',
        keywords: [
            'pasantia',
            'pasante',
            'practica profesional',
            'practicas profesionales',
            'internship'
        ]
    },
    {
        type: 'project',
        keywords: [
            'proyecto',
            'proyectos',
            'portafolio',
            'hackathon',
            'freelance',
            'trabajo independiente'
        ]
    },
    {
        type: 'academic',
        keywords: [
            ...ACADEMIC_WORK_TERMS,
            'universidad',
            'colegio',
            'escuela',
            'bachiller'
        ]
    },
    {
        type: 'formal_employment',
        keywords: [
            'empresa',
            'contrato',
            'planilla',
            'empleo formal',
            'cargo de',
            'puesto de',
            'trabaje en',
            'trabajé en'
        ]
    },
    {
        type: 'informal_work',
        keywords: [
            'trabaje',
            'trabajé',
            'trabajo informal',
            'ayudaba',
            'vendia',
            'vendía',
            'atendia',
            'atendía',
            'sin contrato',
            'medio tiempo'
        ]
    }
];
function hasPossessiveFamilyVenue(haystack) {
    return POSSESSIVE_FAMILY_VENUES.some((venue)=>FAMILY_NOUNS.some((noun)=>FAMILY_POSSESSIVE_PREFIXES.some((prefix)=>haystack.includes(`${venue} de ${prefix} ${noun}`))));
}
function isFamilyBusiness(haystack) {
    const hasVenue = FAMILY_VENUE_TERMS.some((venue)=>haystack.includes(venue));
    const hasRelation = FAMILY_RELATIONS.some((relation)=>haystack.includes(relation));
    return hasVenue && hasRelation || hasPossessiveFamilyVenue(haystack);
}
function inferExperienceType(text) {
    const haystack = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeTerm"])(text);
    // Keyword combinations catch family work phrased in the candidate's own words
    // ("tienda de mi mamá", "puesto de mi papá"), not just the exact phrases below.
    if (isFamilyBusiness(haystack)) return 'family_business';
    for (const rule of EXPERIENCE_TYPE_RULES){
        if (rule.keywords.some((keyword)=>haystack.includes((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeTerm"])(keyword)))) return rule.type;
    }
    return 'informal_work';
}
}),
"[project]/packages/profile/src/heuristic.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "heuristicProfileExtractor",
    ()=>heuristicProfileExtractor,
    "splitStatements",
    ()=>splitStatements
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/skills.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$experience$2d$type$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/experience-type.ts [app-route] (ecmascript)");
;
;
const EXPERIENCE_SIGNALS = [
    'experiencia',
    'trabaje',
    'trabajé',
    'labore',
    'laboré',
    'ayudaba',
    'ayudé',
    'voluntar',
    'pasantia',
    'pasantía',
    'pasante',
    'proyecto',
    'negocio',
    'tienda',
    'fonda',
    'atendi',
    'atendí',
    'vendi',
    'vendí',
    'cargo',
    'puesto',
    'empresa',
    'colabore',
    'colaboré',
    'realice',
    'realicé',
    'desarrolle',
    'desarrollé',
    'mantenimiento',
    'soporte',
    'servicio al cliente',
    ...__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$experience$2d$type$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ACADEMIC_WORK_TERMS"]
];
const EDUCATION_SIGNALS = [
    'bachiller',
    'licenciatura',
    'universidad',
    'colegio',
    'instituto',
    'escuela',
    'tecnico',
    'técnico',
    'secundaria',
    'primaria'
];
const CERTIFICATION_SIGNALS = [
    'certificado',
    'certificacion',
    'certificación',
    'curso',
    'diplomado',
    'acredita'
];
const MAX_EXPERIENCES = 8;
const MAX_EDUCATION = 4;
const MAX_CERTIFICATIONS = 6;
function splitStatements(text) {
    return text.split(/\r?\n|(?<=[.;])\s+|[\u2022\u25CF]|\s+-\s+/u).map((statement)=>statement.trim()).filter((statement)=>statement.length > 0);
}
function containsAny(statement, signals) {
    const haystack = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeTerm"])(statement);
    return signals.some((signal)=>haystack.includes((0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeTerm"])(signal)));
}
function firstWords(value, count) {
    const words = value.split(/\s+/).filter(Boolean);
    const title = words.slice(0, count).join(' ');
    return title.length > 120 ? `${title.slice(0, 117)}...` : title;
}
/** Build an experience draft anchored to one exact statement. */ function experienceFromStatement(statement, provenance) {
    return {
        experience_type: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$experience$2d$type$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inferExperienceType"])(statement),
        title: firstWords(statement, 8),
        description: statement,
        evidence: [
            {
                claim: statement,
                source: provenance,
                excerpt: statement
            }
        ]
    };
}
function educationLevelOf(statement) {
    const haystack = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeTerm"])(statement);
    if (haystack.includes('bachiller') || haystack.includes('secundaria')) return 'secondary';
    if (haystack.includes('licenciatura') || haystack.includes('universidad')) return 'undergraduate';
    if (haystack.includes('tecnico')) return 'technical';
    if (haystack.includes('curso')) return 'course';
    return 'other';
}
function extractInstitution(statement) {
    const match = statement.match(/(universidad|colegio|instituto|escuela)\s+([\p{L}\p{N}\s.]+)/iu);
    const name = match?.[0]?.trim();
    return name && name.length > 3 ? name.slice(0, 200) : 'No especificada';
}
const heuristicProfileExtractor = {
    kind: 'heuristic',
    async extract (input) {
        const statements = splitStatements(input.text);
        const levelHint = input.provenance === 'declared' ? 1 : 2;
        const experiences = [];
        const education = [];
        const certifications = [];
        for (const statement of statements){
            if (containsAny(statement, CERTIFICATION_SIGNALS)) {
                if (certifications.length < MAX_CERTIFICATIONS) {
                    const issuer = statement.match(/(?:de|por)\s+([\p{L}\p{N}\s.]+)/iu)?.[1]?.trim();
                    const certification = {
                        name: firstWords(statement, 12),
                        evidence: [
                            {
                                claim: statement,
                                source: input.provenance,
                                excerpt: statement
                            }
                        ]
                    };
                    if (issuer && issuer.length > 2) certification.issuer = issuer.slice(0, 200);
                    certifications.push(certification);
                }
                continue;
            }
            if (containsAny(statement, EDUCATION_SIGNALS) && education.length < MAX_EDUCATION) {
                education.push({
                    institution: extractInstitution(statement),
                    program: firstWords(statement, 12),
                    level: educationLevelOf(statement),
                    evidence: [
                        {
                            claim: statement,
                            source: input.provenance,
                            excerpt: statement
                        }
                    ]
                });
            }
            // A statement can be both academic and experiential ("trabajé en la
            // universidad…"), so experience detection runs independently of education.
            if (containsAny(statement, EXPERIENCE_SIGNALS) && experiences.length < MAX_EXPERIENCES) {
                experiences.push(experienceFromStatement(statement, input.provenance));
            }
        }
        const skills = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["matchMentions"])(input.text).map((match)=>({
                original_term: match.matchedTerm,
                canonical_hint: match.skill.skill_id,
                kind_hint: match.skill.kind,
                level_hint: levelHint,
                evidence: [
                    {
                        claim: `Mentions ${match.matchedTerm}`,
                        source: input.provenance,
                        excerpt: match.matchedTerm
                    }
                ]
            }));
        const draft = {
            skills,
            experiences,
            education,
            certifications
        };
        if (input.targetRoles?.length) draft.target_roles = [
            ...input.targetRoles
        ];
        if (input.locale) draft.locale = input.locale;
        draft.notes = [
            'Extracted with the deterministic heuristic extractor; levels and relevance require confirmation.'
        ];
        if (experiences.length === MAX_EXPERIENCES) {
            draft.notes.push('Experience list was truncated to the first 8 entries.');
        }
        return {
            draft,
            kind: 'heuristic'
        };
    }
};
}),
"[project]/packages/profile/src/index.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$build$2d$profile$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/build-profile.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$classify$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/classify.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$experience$2d$type$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/experience-type.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$heuristic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/heuristic.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$normalize$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/normalize.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$resilient$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/resilient.ts [app-route] (ecmascript)");
;
;
;
;
;
;
}),
"[project]/packages/profile/src/normalize.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "normalizeProfileDraft",
    ()=>normalizeProfileDraft,
    "strongestProvenance",
    ()=>strongestProvenance
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/index.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$validators$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/validators.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/constants.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ids$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/ids.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/skills.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__matchSkill__as__profileMatchSkill$3e$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/skills.ts [app-route] (ecmascript) <export matchSkill as profileMatchSkill>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$roles$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/domain/src/taxonomy/roles.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$classify$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/classify.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$experience$2d$type$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/experience-type.ts [app-route] (ecmascript)");
;
;
;
function clampLevel(value) {
    const bounded = Math.max(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SKILL_LEVEL_MIN"], Math.min(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SKILL_LEVEL_MAX"], Math.round(value)));
    return bounded;
}
function provenanceRank(provenance) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVENANCE_RANK"][provenance];
}
function strongestProvenance(records) {
    let strongest = 'declared';
    for (const record of records){
        if (provenanceRank(record.source) > provenanceRank(strongest)) strongest = record.source;
    }
    return strongest;
}
function slugify(value) {
    const slug = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeTerm"])(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || 'unknown';
}
class EvidenceFactory {
    provenance;
    sourceRef;
    now;
    byKey;
    records;
    constructor(provenance, sourceRef, now){
        this.provenance = provenance;
        this.sourceRef = sourceRef;
        this.now = now;
        this.byKey = new Map();
        this.records = [];
    }
    add(draft, fallbackClaim) {
        const claim = (draft?.claim?.trim() || fallbackClaim).trim();
        const source = this.resolveSource(draft?.source);
        const key = [
            this.sourceRef,
            source,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeTerm"])(claim)
        ].join('|');
        const existing = this.byKey.get(key);
        if (existing) return existing.id;
        const confidence = draft?.confidence ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CONFIDENCE_BY_PROVENANCE"][source];
        const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ids$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeId"])('ev', key);
        const record = {
            id,
            claim,
            source,
            confidence,
            captured_at: this.now().toISOString(),
            source_ref: draft?.source_ref ?? this.sourceRef
        };
        if (draft?.excerpt) record.excerpt = draft.excerpt;
        this.byKey.set(key, record);
        this.records.push(record);
        return id;
    }
    /**
   * Clamp a draft-supplied evidence source so it never claims document-level or
   * verified evidence the intake source itself could not produce. This keeps
   * provenance honest and stops a model from raising a declared fact above
   * level 1 by relabelling its own evidence as `extracted`.
   */ resolveSource(requested) {
        const candidate = requested ?? this.provenance;
        if (__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LEVEL_BEYOND_BASIC_PROVENANCE"].includes(candidate) && provenanceRank(candidate) > provenanceRank(this.provenance)) {
            return this.provenance;
        }
        return candidate;
    }
}
/** Attach a draft's evidence (or one fallback record) and return the evidence ids. */ function collectEvidence(evidence, draftEvidence, fallbackClaim) {
    const items = draftEvidence ?? [];
    return items.length > 0 ? items.map((item)=>evidence.add(item, fallbackClaim)) : [
        evidence.add(undefined, fallbackClaim)
    ];
}
function resolveTaxonomy(draft) {
    const hint = draft.canonical_hint?.trim();
    if (hint) {
        const byId = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TAXONOMY_BY_ID"].get(hint);
        if (byId) return byId;
        const byHint = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__matchSkill__as__profileMatchSkill$3e$__["profileMatchSkill"])(hint);
        if (byHint) return byHint.skill;
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__matchSkill__as__profileMatchSkill$3e$__["profileMatchSkill"])(draft.original_term)?.skill;
}
function buildSkill(draft, evidence, provenance) {
    const original = draft.original_term.trim();
    if (!original) return undefined;
    const taxonomy = resolveTaxonomy(draft);
    const notes = [];
    const evidenceIds = collectEvidence(evidence, draft.evidence, original);
    const records = evidence.records.filter((record)=>evidenceIds.includes(record.id));
    const strongest = strongestProvenance(records);
    // A skill may exceed level 1 only when both the intake provenance and its own
    // evidence are strong enough (extracted/verified). Declared-only evidence caps
    // it at level 1 regardless of what the draft asked for.
    const beyondBasic = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LEVEL_BEYOND_BASIC_PROVENANCE"].includes(provenance) && __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LEVEL_BEYOND_BASIC_PROVENANCE"].includes(strongest);
    let level = clampLevel(draft.level_hint ?? (provenance === 'declared' ? 1 : 2));
    if (level > 0 && !beyondBasic && level > __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DECLARED_ONLY_MAX_LEVEL"]) {
        level = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DECLARED_ONLY_MAX_LEVEL"];
        notes.push('Declared-only skill capped at level 1 until stronger evidence is provided.');
    }
    let skillId;
    let canonicalName;
    let kind = draft.kind_hint ?? 'soft';
    if (taxonomy) {
        skillId = taxonomy.skill_id;
        canonicalName = taxonomy.canonical_name;
        kind = taxonomy.kind;
    } else {
        skillId = `plp:unmapped:${slugify(original)}`;
        canonicalName = original;
        notes.push('Not present in the curated taxonomy; skill kept unmapped and capped at level 1.');
        if (level > 1) level = 1;
    }
    const confidence = draft.confidence ?? Math.max(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MIN_CONFIDENCE"], Math.min(1, records.reduce((min, r)=>Math.min(min, r.confidence), 1)));
    const skill = {
        skill_id: skillId,
        canonical_name: canonicalName,
        original_term: original,
        kind,
        level,
        evidence_ids: [
            ...new Set(evidenceIds)
        ],
        source: strongest,
        confidence: Number(confidence.toFixed(2))
    };
    if (taxonomy) skill.synonyms = taxonomy.synonyms;
    if (notes.length) skill.normalization_notes = notes;
    return {
        skill
    };
}
function mergeSkills(skills) {
    const merged = new Map();
    for (const skill of skills){
        const existing = merged.get(skill.skill_id);
        if (!existing) {
            merged.set(skill.skill_id, {
                ...skill
            });
            continue;
        }
        existing.level = Math.max(existing.level, skill.level);
        existing.evidence_ids = [
            ...new Set([
                ...existing.evidence_ids,
                ...skill.evidence_ids
            ])
        ];
        existing.confidence = Number(Math.max(existing.confidence, skill.confidence).toFixed(2));
        if (provenanceRank(skill.source) > provenanceRank(existing.source)) existing.source = skill.source;
        const notes = [
            ...existing.normalization_notes ?? [],
            ...skill.normalization_notes ?? []
        ];
        if (notes.length) existing.normalization_notes = [
            ...new Set(notes)
        ];
    }
    return [
        ...merged.values()
    ].sort((a, b)=>a.skill_id.localeCompare(b.skill_id));
}
function buildExperience(draft, evidence, provenance, roles) {
    const evidenceIds = collectEvidence(evidence, draft.evidence, draft.description || draft.title);
    const detected = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["matchMentions"])([
        draft.title,
        draft.organization ?? '',
        draft.description
    ].join(' ')).map((match)=>match.skill.skill_id);
    const skillIds = [
        ...new Set(detected)
    ].sort();
    const experienceType = draft.experience_type ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$experience$2d$type$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inferExperienceType"])(draft.description);
    const classification = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$classify$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["classifyExperience"])({
        description: draft.description,
        experienceType,
        roles,
        skillIds
    });
    const records = evidence.records.filter((record)=>evidenceIds.includes(record.id));
    const confidence = draft.confidence ?? Math.max(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MIN_CONFIDENCE"], classification.score || __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_EXPERIENCE_CONFIDENCE"]);
    const experience = {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ids$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeId"])('exp', [
            experienceType,
            draft.title,
            draft.organization ?? '',
            draft.description
        ].join('|')),
        experience_type: experienceType,
        title: draft.title.trim(),
        description: draft.description.trim(),
        source: strongestProvenance(records),
        relevance: classification.relevance,
        relevance_reason: classification.reason,
        skill_ids: skillIds,
        evidence_ids: [
            ...new Set(evidenceIds)
        ],
        confidence: Number(confidence.toFixed(2))
    };
    if (draft.organization) experience.organization = draft.organization;
    if (draft.started_at) experience.started_at = draft.started_at;
    if (draft.ended_at) experience.ended_at = draft.ended_at;
    if (draft.ongoing !== undefined) experience.ongoing = draft.ongoing;
    if (draft.location) experience.location = draft.location;
    return experience;
}
function buildEducation(draft, evidence) {
    const claim = `${draft.program} — ${draft.institution}`;
    const evidenceIds = collectEvidence(evidence, draft.evidence, claim);
    const records = evidence.records.filter((record)=>evidenceIds.includes(record.id));
    const education = {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ids$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeId"])('edu', [
            draft.institution,
            draft.program,
            draft.level ?? ''
        ].join('|')),
        institution: draft.institution.trim(),
        program: draft.program.trim(),
        source: strongestProvenance(records),
        evidence_ids: [
            ...new Set(evidenceIds)
        ],
        confidence: Number((draft.confidence ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CONFIDENCE_BY_PROVENANCE"][strongestProvenance(records)]).toFixed(2))
    };
    if (draft.level) education.level = draft.level;
    if (draft.started_at) education.started_at = draft.started_at;
    if (draft.ended_at) education.ended_at = draft.ended_at;
    if (draft.ongoing !== undefined) education.ongoing = draft.ongoing;
    return education;
}
function buildCertification(draft, evidence) {
    const evidenceIds = collectEvidence(evidence, draft.evidence, draft.name);
    const records = evidence.records.filter((record)=>evidenceIds.includes(record.id));
    const strongest = strongestProvenance(records);
    const certification = {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ids$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeId"])('cert', [
            draft.name,
            draft.issuer ?? '',
            draft.issued_at ?? ''
        ].join('|')),
        name: draft.name.trim(),
        status: strongest === 'verified' ? 'verified' : 'declared',
        source: strongest,
        evidence_ids: [
            ...new Set(evidenceIds)
        ],
        confidence: Number((draft.confidence ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CONFIDENCE_BY_PROVENANCE"][strongest]).toFixed(2))
    };
    if (draft.issuer) certification.issuer = draft.issuer;
    if (draft.issued_at) certification.issued_at = draft.issued_at;
    if (draft.expires_at) certification.expires_at = draft.expires_at;
    if (draft.credential_url) certification.credential_url = draft.credential_url;
    const skillIds = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$skills$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["matchMentions"])(draft.name).map((match)=>match.skill.skill_id);
    if (skillIds.length) certification.skill_ids = [
        ...new Set(skillIds)
    ].sort();
    return certification;
}
function normalizeProfileDraft(draft, options) {
    const now = options.now ?? (()=>new Date());
    const provenance = options.provenance;
    const sourceRef = options.sources[0]?.ref ?? 'intake:unknown';
    const evidence = new EvidenceFactory(provenance, sourceRef, now);
    const roles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$taxonomy$2f$roles$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolveTargetRoles"])(options.targetRoles ?? draft.target_roles);
    const skills = mergeSkills((draft.skills ?? []).map((item)=>buildSkill(item, evidence, provenance)).filter((value)=>value !== undefined).map((value)=>value.skill));
    const experiences = (draft.experiences ?? []).map((item)=>buildExperience(item, evidence, provenance, roles)).sort((a, b)=>(b.started_at ?? '').localeCompare(a.started_at ?? '') || a.id.localeCompare(b.id));
    const education = (draft.education ?? []).map((item)=>buildEducation(item, evidence)).sort((a, b)=>a.id.localeCompare(b.id));
    const certifications = (draft.certifications ?? []).map((item)=>buildCertification(item, evidence)).sort((a, b)=>a.id.localeCompare(b.id));
    const timestamp = now().toISOString();
    const candidateSeed = options.candidateId ?? sourceRef;
    const warnings = [
        ...options.warnings ?? [],
        ...draft.notes ?? []
    ];
    const profile = {
        schema_version: __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROFILE_SCHEMA_VERSION"],
        candidate_id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$ids$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeId"])('candidate', candidateSeed),
        locale: options.locale ?? draft.locale ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEFAULT_LOCALE"],
        created_at: timestamp,
        updated_at: timestamp,
        sources: [
            ...options.sources
        ],
        skills,
        experiences,
        education,
        certifications,
        evidence: [
            ...evidence.records
        ].sort((a, b)=>a.id.localeCompare(b.id)),
        trace_id: options.traceId
    };
    const targetRoles = options.targetRoles ?? draft.target_roles;
    if (targetRoles && targetRoles.length) profile.target_roles = [
        ...new Set(targetRoles)
    ];
    if (warnings.length) profile.warnings = [
        ...new Set(warnings)
    ];
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$domain$2f$src$2f$validators$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertCandidateProfile"])(profile);
    return profile;
}
}),
"[project]/packages/profile/src/resilient.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createResilientExtractor",
    ()=>createResilientExtractor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$heuristic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/profile/src/heuristic.ts [app-route] (ecmascript)");
;
function createResilientExtractor(options) {
    const fallback = options.fallback ?? __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$profile$2f$src$2f$heuristic$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["heuristicProfileExtractor"];
    return {
        kind: options.primary.kind,
        async extract (input) {
            try {
                const outcome = await options.primary.extract(input);
                return {
                    draft: outcome.draft,
                    kind: outcome.kind
                };
            } catch (error) {
                options.onFallback?.(error);
                const outcome = await fallback.extract(input);
                return {
                    draft: outcome.draft,
                    kind: 'heuristic-fallback'
                };
            }
        }
    };
}
}),
]})(),
"[externals]/async_hooks [external] (async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("async_hooks", () => require("async_hooks"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/dns [external] (dns, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("dns", () => require("dns"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/fs/promises [external] (fs/promises, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("fs/promises", () => require("fs/promises"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/module [external] (module, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("module", () => require("module"));

module.exports = mod;
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:diagnostics_channel [external] (node:diagnostics_channel, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:diagnostics_channel", () => require("node:diagnostics_channel"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/path/posix [external] (path/posix, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("path/posix", () => require("path/posix"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/stream/web [external] (stream/web, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("stream/web", () => require("stream/web"));

module.exports = mod;
}),
"[externals]/tls [external] (tls, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("tls", () => require("tls"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[project]/apps/agent-runtime/src/workflow/carrier.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puentelaboral.pa/schemas/workflow-carrier.schema.json",
    "title": "WorkflowCarrier",
    "description": "State carried between Mastra agent steps, validated with Ajv against JSON Schema 2020-12.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "traceId",
        "idempotencyKey",
        "candidateText",
        "vacancyText",
        "declaredCredentials",
        "actorId",
        "actorRole",
        "requestedTools",
        "halted",
        "status",
        "findings",
        "summaries",
        "modelFallbacks"
    ],
    "properties": {
        "traceId": {
            "type": "string"
        },
        "idempotencyKey": {
            "type": "string"
        },
        "candidateText": {
            "type": "string"
        },
        "vacancyText": {
            "type": "string"
        },
        "declaredCredentials": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/DeclaredCredentialClaim"
            }
        },
        "actorId": {
            "type": "string"
        },
        "actorRole": {
            "enum": [
                "candidate",
                "counselor",
                "employer",
                "system"
            ]
        },
        "requestedTools": {
            "type": "array",
            "items": {
                "type": "string"
            }
        },
        "halted": {
            "type": "boolean"
        },
        "status": {
            "enum": [
                "running",
                "success",
                "rejected",
                "dead_letter"
            ]
        },
        "findings": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/GuardrailFinding"
            }
        },
        "summaries": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/AgentSummary"
            }
        },
        "modelFallbacks": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/ModelFallback"
            }
        }
    },
    "$defs": {
        "DeclaredCredentialClaim": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "id",
                "name"
            ],
            "properties": {
                "id": {
                    "type": "string"
                },
                "name": {
                    "type": "string"
                }
            }
        },
        "GuardrailFinding": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "allowed",
                "stage",
                "code",
                "reason",
                "source"
            ],
            "properties": {
                "allowed": {
                    "type": "boolean"
                },
                "stage": {
                    "enum": [
                        "input",
                        "tool_result",
                        "permission",
                        "output",
                        "schema"
                    ]
                },
                "code": {
                    "enum": [
                        "ok",
                        "prompt_injection",
                        "pii_leak",
                        "invalid_schema",
                        "invented_credential",
                        "unauthorized_tool"
                    ]
                },
                "reason": {
                    "type": "string"
                },
                "source": {
                    "type": "string"
                }
            }
        },
        "AgentSummary": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "agent",
                "summary"
            ],
            "properties": {
                "agent": {
                    "enum": [
                        "exploration",
                        "profile_and_evidence",
                        "market_and_matching",
                        "training"
                    ]
                },
                "summary": {
                    "type": "string"
                }
            }
        },
        "ModelFallback": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "capability",
                "from",
                "to"
            ],
            "properties": {
                "capability": {
                    "type": "string"
                },
                "from": {
                    "type": "string"
                },
                "to": {
                    "type": "string"
                }
            }
        }
    }
};
}),
"[project]/packages/domain/src/schemas/agent-envelope.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puentelaboral.pa/schemas/agent-envelope.schema.json",
    "title": "AgentEnvelope",
    "description": "Internal agent-to-agent message. trace_id and idempotency_key are mandatory on every hop.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "trace_id",
        "idempotency_key",
        "agent",
        "kind",
        "payload"
    ],
    "properties": {
        "trace_id": {
            "type": "string",
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$"
        },
        "idempotency_key": {
            "type": "string",
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$"
        },
        "agent": {
            "enum": [
                "exploration",
                "profile_and_evidence",
                "market_and_matching",
                "training"
            ]
        },
        "kind": {
            "enum": [
                "request",
                "response",
                "event"
            ]
        },
        "payload": {
            "type": "object"
        }
    }
};
}),
"[project]/packages/domain/src/schemas/candidate-profile.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puente-laboral.pa/schemas/candidate-profile/1.0.0",
    "title": "CandidateProfile",
    "description": "The validated candidate profile document persisted by the intake pipeline. Preferences are a separate concern owned by ticket #7 and are intentionally not part of version 1.0.0.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "schema_version",
        "candidate_id",
        "locale",
        "created_at",
        "updated_at",
        "sources",
        "skills",
        "experiences",
        "education",
        "certifications",
        "evidence",
        "trace_id"
    ],
    "properties": {
        "schema_version": {
            "const": "1.0.0"
        },
        "candidate_id": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
        },
        "locale": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/language_tag"
        },
        "created_at": {
            "type": "string",
            "format": "date-time"
        },
        "updated_at": {
            "type": "string",
            "format": "date-time"
        },
        "target_roles": {
            "type": "array",
            "items": {
                "type": "string",
                "minLength": 1
            },
            "uniqueItems": true
        },
        "sources": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/intake-source/1.0.0"
            },
            "minItems": 1
        },
        "skills": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/skill/1.0.0"
            }
        },
        "experiences": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/experience/1.0.0"
            }
        },
        "education": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/education/1.0.0"
            }
        },
        "certifications": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/certification/1.0.0"
            }
        },
        "evidence": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/evidence/1.0.0"
            }
        },
        "warnings": {
            "type": "array",
            "items": {
                "type": "string",
                "minLength": 1
            }
        },
        "trace_id": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
        }
    }
};
}),
"[project]/packages/domain/src/schemas/certification.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puente-laboral.pa/schemas/certification/1.0.0",
    "title": "CandidateCertification",
    "description": "A declared or verified certification. Ticket #4 persists declared certifications only; verification states are defined here so ticket #6 can extend the same contract.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "id",
        "name",
        "status",
        "source",
        "evidence_ids",
        "confidence"
    ],
    "properties": {
        "id": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
        },
        "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 300
        },
        "issuer": {
            "type": "string",
            "maxLength": 200
        },
        "issued_at": {
            "type": "string",
            "format": "date"
        },
        "expires_at": {
            "type": "string",
            "format": "date"
        },
        "credential_url": {
            "type": "string",
            "format": "uri"
        },
        "status": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/credential_status"
        },
        "source": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/provenance"
        },
        "evidence_ids": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
            },
            "uniqueItems": true
        },
        "skill_ids": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
            },
            "uniqueItems": true
        },
        "confidence": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/confidence"
        }
    }
};
}),
"[project]/packages/domain/src/schemas/common.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puente-laboral.pa/schemas/common/1.0.0",
    "title": "Common definitions",
    "description": "Shared enums and scalar definitions for the Puente Laboral Panamá agent contracts. Version 1.0.0, JSON Schema 2020-12.",
    "$defs": {
        "identifier": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200,
            "pattern": "^[A-Za-z0-9_.:-]+$"
        },
        "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
        },
        "provenance": {
            "description": "How a fact entered the system: declared by the candidate, extracted from a document, verified against an external source, or inferred by a model.",
            "type": "string",
            "enum": [
                "declared",
                "extracted",
                "verified",
                "inferred"
            ]
        },
        "skill_kind": {
            "type": "string",
            "enum": [
                "technical",
                "soft"
            ]
        },
        "skill_level": {
            "description": "Ordinal skill level: 0 no evidence, 1 basic, 2 functional, 3 advanced, 4 expert.",
            "type": "integer",
            "minimum": 0,
            "maximum": 4
        },
        "experience_type": {
            "type": "string",
            "enum": [
                "formal_employment",
                "informal_work",
                "family_business",
                "volunteering",
                "project",
                "academic",
                "internship"
            ]
        },
        "relevance": {
            "type": "string",
            "enum": [
                "relevant",
                "partially_relevant",
                "not_relevant",
                "requires_additional_evidence"
            ]
        },
        "credential_status": {
            "description": "Normalized credential verification state. Only `verified` satisfies a mandatory credential.",
            "type": "string",
            "enum": [
                "declared",
                "verified",
                "partially_verified",
                "unverified",
                "rejected"
            ]
        },
        "intake_source_kind": {
            "type": "string",
            "enum": [
                "pdf",
                "image",
                "text",
                "audio_transcript"
            ]
        },
        "language_tag": {
            "type": "string",
            "pattern": "^[a-z]{2}(-[A-Z]{2})?$",
            "description": "BCP-47 style tag, e.g. `es-PA`."
        }
    }
};
}),
"[project]/packages/domain/src/schemas/education.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puente-laboral.pa/schemas/education/1.0.0",
    "title": "CandidateEducation",
    "description": "A formal or non-formal education record extracted from candidate intake.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "id",
        "institution",
        "program",
        "source",
        "evidence_ids",
        "confidence"
    ],
    "properties": {
        "id": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
        },
        "institution": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
        },
        "program": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
        },
        "level": {
            "type": "string",
            "enum": [
                "primary",
                "secondary",
                "technical",
                "undergraduate",
                "postgraduate",
                "course",
                "other"
            ]
        },
        "started_at": {
            "type": "string",
            "format": "date"
        },
        "ended_at": {
            "type": "string",
            "format": "date"
        },
        "ongoing": {
            "type": "boolean"
        },
        "source": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/provenance"
        },
        "evidence_ids": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
            },
            "uniqueItems": true
        },
        "confidence": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/confidence"
        }
    }
};
}),
"[project]/packages/domain/src/schemas/evidence.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puente-laboral.pa/schemas/evidence/1.0.0",
    "title": "Evidence",
    "description": "A single provenance-bearing fact supporting a candidate claim.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "id",
        "claim",
        "source",
        "confidence"
    ],
    "properties": {
        "id": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
        },
        "claim": {
            "type": "string",
            "minLength": 1,
            "maxLength": 2000
        },
        "source": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/provenance"
        },
        "source_ref": {
            "type": "string",
            "maxLength": 500,
            "description": "Pointer to where the fact came from, e.g. `intake:cv.pdf#page=1` or `candidate:statement`."
        },
        "excerpt": {
            "type": "string",
            "maxLength": 2000
        },
        "confidence": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/confidence"
        },
        "captured_at": {
            "type": "string",
            "format": "date-time"
        }
    }
};
}),
"[project]/packages/domain/src/schemas/experience.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puente-laboral.pa/schemas/experience/1.0.0",
    "title": "CandidateExperience",
    "description": "A formal or informal experience entry with a deterministic relevance classification and evidence provenance.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "id",
        "experience_type",
        "title",
        "description",
        "source",
        "relevance",
        "relevance_reason",
        "skill_ids",
        "evidence_ids",
        "confidence"
    ],
    "properties": {
        "id": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
        },
        "experience_type": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/experience_type"
        },
        "title": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
        },
        "organization": {
            "type": "string",
            "maxLength": 200
        },
        "description": {
            "type": "string",
            "maxLength": 4000
        },
        "started_at": {
            "type": "string",
            "format": "date"
        },
        "ended_at": {
            "type": "string",
            "format": "date"
        },
        "ongoing": {
            "type": "boolean"
        },
        "location": {
            "type": "string",
            "maxLength": 200
        },
        "source": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/provenance"
        },
        "relevance": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/relevance"
        },
        "relevance_reason": {
            "type": "string",
            "minLength": 1,
            "maxLength": 1000
        },
        "skill_ids": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
            },
            "uniqueItems": true
        },
        "evidence_ids": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
            },
            "uniqueItems": true
        },
        "confidence": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/confidence"
        }
    },
    "allOf": [
        {
            "description": "An entry without description or evidence cannot be classified as relevant.",
            "if": {
                "properties": {
                    "relevance": {
                        "enum": [
                            "relevant",
                            "partially_relevant"
                        ]
                    }
                },
                "required": [
                    "relevance"
                ]
            },
            "then": {
                "properties": {
                    "description": {
                        "type": "string",
                        "minLength": 1
                    },
                    "evidence_ids": {
                        "type": "array",
                        "minItems": 1
                    }
                }
            }
        }
    ]
};
}),
"[project]/packages/domain/src/schemas/intake-request.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puente-laboral.pa/schemas/intake-request/1.0.0",
    "title": "IntakeRequest",
    "description": "One candidate intake submission accepted by the apps/web intake API. PDF and image sources carry base64 content; text and pre-transcribed audio carry inline text.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "kind"
    ],
    "properties": {
        "kind": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/intake_source_kind"
        },
        "text": {
            "type": "string",
            "maxLength": 200000,
            "description": "Pasted CV text or a pre-transcribed audio description."
        },
        "fileName": {
            "type": "string",
            "maxLength": 300
        },
        "mimeType": {
            "type": "string",
            "maxLength": 150
        },
        "contentBase64": {
            "type": "string",
            "maxLength": 35000000,
            "description": "Base64-encoded bytes for a PDF or image source."
        },
        "altText": {
            "type": "string",
            "maxLength": 20000,
            "description": "Optional human-provided transcription/description for an image when no vision provider is configured."
        },
        "candidateId": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
        },
        "targetRoles": {
            "type": "array",
            "items": {
                "type": "string",
                "minLength": 1
            },
            "uniqueItems": true
        },
        "locale": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/language_tag"
        },
        "traceId": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
        }
    },
    "allOf": [
        {
            "if": {
                "properties": {
                    "kind": {
                        "enum": [
                            "text",
                            "audio_transcript"
                        ]
                    }
                },
                "required": [
                    "kind"
                ]
            },
            "then": {
                "required": [
                    "text"
                ]
            }
        },
        {
            "if": {
                "properties": {
                    "kind": {
                        "enum": [
                            "pdf",
                            "image"
                        ]
                    }
                },
                "required": [
                    "kind"
                ]
            },
            "then": {
                "required": [
                    "contentBase64"
                ]
            }
        }
    ]
};
}),
"[project]/packages/domain/src/schemas/intake-result.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puente-laboral.pa/schemas/intake-result/1.0.0",
    "title": "IntakeResult",
    "description": "Response returned by the intake pipeline: the validated CandidateProfile plus extraction provenance and review flags.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "trace_id",
        "profile",
        "extraction"
    ],
    "properties": {
        "trace_id": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
        },
        "profile": {
            "$ref": "https://puente-laboral.pa/schemas/candidate-profile/1.0.0"
        },
        "extraction": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "extractor",
                "needs_review",
                "warnings"
            ],
            "properties": {
                "extractor": {
                    "type": "string",
                    "enum": [
                        "heuristic",
                        "llm",
                        "heuristic-fallback"
                    ]
                },
                "needs_review": {
                    "type": "boolean"
                },
                "warnings": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "minLength": 1
                    }
                }
            }
        }
    }
};
}),
"[project]/packages/domain/src/schemas/intake-source.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puente-laboral.pa/schemas/intake-source/1.0.0",
    "title": "IntakeSource",
    "description": "Provenance record for one raw candidate input converted to text before profile extraction.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "kind",
        "ref",
        "extraction_method",
        "extracted_at"
    ],
    "properties": {
        "kind": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/intake_source_kind"
        },
        "ref": {
            "type": "string",
            "minLength": 1,
            "maxLength": 300
        },
        "mime_type": {
            "type": "string",
            "maxLength": 150
        },
        "byte_length": {
            "type": "integer",
            "minimum": 0
        },
        "page_count": {
            "type": "integer",
            "minimum": 0
        },
        "extracted_char_count": {
            "type": "integer",
            "minimum": 0
        },
        "extraction_method": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120,
            "description": "Adapter that produced the text, e.g. `unpdf`, `vision`, `tesseract`, `passthrough`."
        },
        "extraction_confidence": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/confidence"
        },
        "warnings": {
            "type": "array",
            "items": {
                "type": "string",
                "minLength": 1
            }
        },
        "extracted_at": {
            "type": "string",
            "format": "date-time"
        }
    }
};
}),
"[project]/packages/domain/src/schemas/job-requirements.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puentelaboral.pa/schemas/job-requirements.schema.json",
    "title": "JobRequirements",
    "description": "Normalized vacancy requirements with mandatory/desirable separation, ESCO-based skill mapping, fairness alerts, and ranking eligibility. Emitted by the Market and Matching slice after vacancy normalization.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "schemaVersion",
        "vacancyId",
        "title",
        "source",
        "capturedAt",
        "taxonomyVersion",
        "status",
        "requirements",
        "alerts",
        "reviewQueue",
        "blockingReasons",
        "metadata"
    ],
    "properties": {
        "schemaVersion": {
            "const": "1.0.0"
        },
        "vacancyId": {
            "type": "string",
            "minLength": 1
        },
        "title": {
            "type": "string",
            "minLength": 1
        },
        "employer": {
            "type": [
                "string",
                "null"
            ]
        },
        "source": {
            "enum": [
                "manual",
                "json",
                "pdf",
                "image"
            ]
        },
        "capturedAt": {
            "type": "string",
            "format": "date-time"
        },
        "locale": {
            "type": "string",
            "minLength": 2
        },
        "taxonomyVersion": {
            "type": "string",
            "minLength": 1
        },
        "status": {
            "enum": [
                "accepted",
                "requires_human_review",
                "blocked"
            ]
        },
        "location": {
            "$ref": "#/$defs/Location"
        },
        "requirements": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/Requirement"
            }
        },
        "alerts": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/Alert"
            }
        },
        "reviewQueue": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/ReviewItem"
            }
        },
        "blockingReasons": {
            "type": "array",
            "items": {
                "type": "string",
                "minLength": 1
            }
        },
        "metadata": {
            "$ref": "#/$defs/Metadata"
        }
    },
    "$defs": {
        "Location": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "country",
                "province",
                "district",
                "raw"
            ],
            "properties": {
                "country": {
                    "type": "string",
                    "minLength": 2
                },
                "province": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "district": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "raw": {
                    "type": [
                        "string",
                        "null"
                    ]
                }
            }
        },
        "CanonicalSkill": {
            "type": "object",
            "additionalProperties": false,
            "description": "Mapping of a requirement to the ESCO-based Panamanian skills taxonomy. The original wording is never discarded; this is the canonical view beside it.",
            "required": [
                "matched",
                "skillId",
                "labelEs",
                "labelEn",
                "escoLabel",
                "escoUri",
                "taxonomyVersion",
                "matchConfidence",
                "matchStrategy"
            ],
            "properties": {
                "matched": {
                    "type": "boolean"
                },
                "skillId": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "labelEs": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "labelEn": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "escoLabel": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "escoUri": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "taxonomyVersion": {
                    "type": "string",
                    "minLength": 1
                },
                "matchConfidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1
                },
                "matchStrategy": {
                    "enum": [
                        "exact",
                        "alias",
                        "fuzzy",
                        "none"
                    ]
                }
            }
        },
        "Requirement": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "id",
                "kind",
                "category",
                "originalWording",
                "normalizedWording",
                "canonical",
                "level",
                "justification",
                "alertId",
                "rankingEligible",
                "excludedFromRanking"
            ],
            "properties": {
                "id": {
                    "type": "string",
                    "minLength": 1
                },
                "kind": {
                    "enum": [
                        "skill",
                        "experience",
                        "education",
                        "certification",
                        "language",
                        "physical",
                        "other"
                    ]
                },
                "category": {
                    "enum": [
                        "mandatory",
                        "desirable"
                    ]
                },
                "originalWording": {
                    "type": "string",
                    "minLength": 1
                },
                "normalizedWording": {
                    "type": "string"
                },
                "canonical": {
                    "$ref": "#/$defs/CanonicalSkill"
                },
                "level": {
                    "type": [
                        "integer",
                        "null"
                    ],
                    "minimum": 0,
                    "maximum": 4
                },
                "justification": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "alertId": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "rankingEligible": {
                    "type": "boolean"
                },
                "excludedFromRanking": {
                    "type": "boolean"
                }
            }
        },
        "Alert": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "id",
                "requirementId",
                "classification",
                "ruleId",
                "reason",
                "matchedText",
                "disposition",
                "resolved"
            ],
            "properties": {
                "id": {
                    "type": "string",
                    "minLength": 1
                },
                "requirementId": {
                    "type": "string",
                    "minLength": 1
                },
                "classification": {
                    "enum": [
                        "ambiguous",
                        "potentially_discriminatory",
                        "prohibited"
                    ]
                },
                "ruleId": {
                    "type": "string",
                    "minLength": 1
                },
                "reason": {
                    "type": "string",
                    "minLength": 1
                },
                "matchedText": {
                    "type": "string",
                    "minLength": 1
                },
                "disposition": {
                    "enum": [
                        "blocked",
                        "human_review"
                    ]
                },
                "resolved": {
                    "type": "boolean"
                },
                "resolution": {
                    "type": [
                        "object",
                        "null"
                    ],
                    "additionalProperties": false,
                    "required": [
                        "decision",
                        "reviewer",
                        "resolvedAt"
                    ],
                    "properties": {
                        "decision": {
                            "enum": [
                                "approved",
                                "rejected"
                            ]
                        },
                        "reviewer": {
                            "type": "string",
                            "minLength": 1
                        },
                        "resolvedAt": {
                            "type": "string",
                            "format": "date-time"
                        }
                    }
                }
            }
        },
        "ReviewItem": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "reviewId",
                "requirementId",
                "alertId",
                "classification",
                "status",
                "reason"
            ],
            "properties": {
                "reviewId": {
                    "type": "string",
                    "minLength": 1
                },
                "requirementId": {
                    "type": "string",
                    "minLength": 1
                },
                "alertId": {
                    "type": "string",
                    "minLength": 1
                },
                "classification": {
                    "enum": [
                        "ambiguous",
                        "potentially_discriminatory"
                    ]
                },
                "status": {
                    "enum": [
                        "pending_human_review"
                    ]
                },
                "reason": {
                    "type": "string",
                    "minLength": 1
                }
            }
        },
        "Metadata": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "inputKind",
                "extractor",
                "extractedAt",
                "rawText",
                "requirementCount",
                "mandatoryCount",
                "desirableCount",
                "alertCount",
                "excludedCount"
            ],
            "properties": {
                "inputKind": {
                    "enum": [
                        "manual",
                        "json",
                        "pdf",
                        "image"
                    ]
                },
                "extractor": {
                    "type": "string",
                    "minLength": 1
                },
                "extractedAt": {
                    "type": "string",
                    "format": "date-time"
                },
                "rawText": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "requirementCount": {
                    "type": "integer",
                    "minimum": 0
                },
                "mandatoryCount": {
                    "type": "integer",
                    "minimum": 0
                },
                "desirableCount": {
                    "type": "integer",
                    "minimum": 0
                },
                "alertCount": {
                    "type": "integer",
                    "minimum": 0
                },
                "excludedCount": {
                    "type": "integer",
                    "minimum": 0
                }
            }
        }
    }
};
}),
"[project]/packages/domain/src/schemas/profile-draft.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puente-laboral.pa/schemas/profile-draft/1.0.0",
    "title": "ProfileDraft",
    "description": "Un-normalized extraction produced by the Profile Agent (heuristic or LLM). Every upstream rule is re-applied deterministically during normalization, so this contract is deliberately permissive about levels and relevance.",
    "type": "object",
    "additionalProperties": false,
    "properties": {
        "full_name": {
            "type": "string",
            "maxLength": 200
        },
        "locale": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/language_tag"
        },
        "target_roles": {
            "type": "array",
            "items": {
                "type": "string",
                "minLength": 1
            },
            "uniqueItems": true
        },
        "skills": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/draft_skill"
            }
        },
        "experiences": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/draft_experience"
            }
        },
        "education": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/draft_education"
            }
        },
        "certifications": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/draft_certification"
            }
        },
        "notes": {
            "type": "array",
            "items": {
                "type": "string",
                "minLength": 1
            }
        }
    },
    "$defs": {
        "draft_evidence": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "claim",
                "source"
            ],
            "properties": {
                "claim": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 2000
                },
                "source": {
                    "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/provenance"
                },
                "source_ref": {
                    "type": "string",
                    "maxLength": 500
                },
                "excerpt": {
                    "type": "string",
                    "maxLength": 2000
                },
                "confidence": {
                    "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/confidence"
                }
            }
        },
        "draft_skill": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "original_term"
            ],
            "properties": {
                "original_term": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200
                },
                "canonical_hint": {
                    "type": "string",
                    "maxLength": 200
                },
                "kind_hint": {
                    "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/skill_kind"
                },
                "level_hint": {
                    "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/skill_level"
                },
                "confidence": {
                    "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/confidence"
                },
                "evidence": {
                    "type": "array",
                    "items": {
                        "$ref": "#/$defs/draft_evidence"
                    }
                }
            }
        },
        "draft_experience": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "experience_type",
                "title",
                "description"
            ],
            "properties": {
                "experience_type": {
                    "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/experience_type"
                },
                "title": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200
                },
                "organization": {
                    "type": "string",
                    "maxLength": 200
                },
                "description": {
                    "type": "string",
                    "maxLength": 4000
                },
                "started_at": {
                    "type": "string",
                    "format": "date"
                },
                "ended_at": {
                    "type": "string",
                    "format": "date"
                },
                "ongoing": {
                    "type": "boolean"
                },
                "location": {
                    "type": "string",
                    "maxLength": 200
                },
                "confidence": {
                    "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/confidence"
                },
                "evidence": {
                    "type": "array",
                    "items": {
                        "$ref": "#/$defs/draft_evidence"
                    }
                }
            }
        },
        "draft_education": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "institution",
                "program"
            ],
            "properties": {
                "institution": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200
                },
                "program": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200
                },
                "level": {
                    "type": "string",
                    "enum": [
                        "primary",
                        "secondary",
                        "technical",
                        "undergraduate",
                        "postgraduate",
                        "course",
                        "other"
                    ]
                },
                "started_at": {
                    "type": "string",
                    "format": "date"
                },
                "ended_at": {
                    "type": "string",
                    "format": "date"
                },
                "ongoing": {
                    "type": "boolean"
                },
                "confidence": {
                    "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/confidence"
                },
                "evidence": {
                    "type": "array",
                    "items": {
                        "$ref": "#/$defs/draft_evidence"
                    }
                }
            }
        },
        "draft_certification": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "name"
            ],
            "properties": {
                "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 300
                },
                "issuer": {
                    "type": "string",
                    "maxLength": 200
                },
                "issued_at": {
                    "type": "string",
                    "format": "date"
                },
                "expires_at": {
                    "type": "string",
                    "format": "date"
                },
                "credential_url": {
                    "type": "string",
                    "format": "uri"
                },
                "confidence": {
                    "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/confidence"
                },
                "evidence": {
                    "type": "array",
                    "items": {
                        "$ref": "#/$defs/draft_evidence"
                    }
                }
            }
        }
    }
};
}),
"[project]/packages/domain/src/schemas/skill.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puente-laboral.pa/schemas/skill/1.0.0",
    "title": "CandidateSkill",
    "description": "A candidate skill with canonical identity, level 0-4, provenance, supporting evidence and confidence. A declared-only skill cannot exceed level 1, and a skill above level 0 must carry at least one piece of evidence.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "skill_id",
        "canonical_name",
        "original_term",
        "kind",
        "level",
        "evidence_ids",
        "source",
        "confidence"
    ],
    "properties": {
        "skill_id": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
        },
        "canonical_name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
        },
        "original_term": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200,
            "description": "The candidate's own wording, always preserved."
        },
        "kind": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/skill_kind"
        },
        "level": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/skill_level"
        },
        "evidence_ids": {
            "type": "array",
            "items": {
                "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/identifier"
            },
            "uniqueItems": true
        },
        "source": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/provenance"
        },
        "confidence": {
            "$ref": "https://puente-laboral.pa/schemas/common/1.0.0#/$defs/confidence"
        },
        "synonyms": {
            "type": "array",
            "items": {
                "type": "string",
                "minLength": 1
            },
            "uniqueItems": true
        },
        "esco_reference": {
            "type": "string",
            "maxLength": 300
        },
        "normalization_notes": {
            "type": "array",
            "items": {
                "type": "string",
                "minLength": 1
            }
        }
    },
    "allOf": [
        {
            "description": "A declared-only skill stays at level 1 or below.",
            "if": {
                "properties": {
                    "source": {
                        "const": "declared"
                    }
                },
                "required": [
                    "source"
                ]
            },
            "then": {
                "properties": {
                    "level": {
                        "type": "integer",
                        "maximum": 1
                    }
                }
            }
        },
        {
            "description": "Any skill above level 0 must cite at least one evidence item.",
            "if": {
                "properties": {
                    "level": {
                        "type": "integer",
                        "minimum": 1
                    }
                },
                "required": [
                    "level"
                ]
            },
            "then": {
                "properties": {
                    "evidence_ids": {
                        "type": "array",
                        "minItems": 1
                    }
                }
            }
        }
    ]
};
}),
"[project]/packages/domain/src/schemas/workflow-run.schema.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://puentelaboral.pa/schemas/workflow-run.schema.json",
    "title": "WorkflowRunRequest",
    "description": "REST body for the internal workflow run. Candidate text and declared credential claims are ports; they are not the CandidateProfile or CredentialVerification documents.",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "trace_id",
        "idempotency_key",
        "candidateText",
        "vacancyText",
        "declaredCredentials",
        "actor",
        "requestedTools"
    ],
    "properties": {
        "trace_id": {
            "type": "string",
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$"
        },
        "idempotency_key": {
            "type": "string",
            "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$"
        },
        "candidateText": {
            "type": "string",
            "minLength": 1
        },
        "vacancyText": {
            "type": "string",
            "minLength": 1
        },
        "declaredCredentials": {
            "type": "array",
            "items": {
                "$ref": "#/$defs/DeclaredCredentialClaim"
            }
        },
        "actor": {
            "$ref": "#/$defs/Actor"
        },
        "requestedTools": {
            "type": "array",
            "items": {
                "type": "string",
                "minLength": 1
            }
        }
    },
    "$defs": {
        "DeclaredCredentialClaim": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "id",
                "name"
            ],
            "properties": {
                "id": {
                    "type": "string",
                    "minLength": 1
                },
                "name": {
                    "type": "string",
                    "minLength": 1
                }
            }
        },
        "Actor": {
            "type": "object",
            "additionalProperties": false,
            "required": [
                "id",
                "role"
            ],
            "properties": {
                "id": {
                    "type": "string",
                    "minLength": 1
                },
                "role": {
                    "enum": [
                        "candidate",
                        "counselor",
                        "employer",
                        "system"
                    ]
                }
            }
        }
    }
};
}),
"[project]/packages/domain/src/taxonomy/panama-skills.taxonomy.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "version": "2026.10.0-pa-seed",
    "source": "ESCO-based Panamanian skills taxonomy (seed subset)",
    "provenance": "Derived from the ESCO occupational skills pillar (v1.1 structure) and localized for the Panama Metro and Panama Oeste target roles: junior technical support, customer service, and administrative work. Each entry keeps an ESCO reference label and an `escoUri` slot; URIs are intentionally null in the seed because they must be verified against the ESCO API before production use (see ADR-0002). Local `id` values are stable and are the join key used by the application.",
    "skills": [
        {
            "id": "PA-IT-0001",
            "labelEs": "Soporte técnico",
            "labelEn": "Technical support",
            "escoLabel": "provide technical support",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "soporte tecnico",
                "soporte de ti",
                "soporte it",
                "mesa de ayuda",
                "help desk",
                "helpdesk",
                "atencion de incidencias",
                "resolucion de tickets"
            ]
        },
        {
            "id": "PA-IT-0002",
            "labelEs": "Mantenimiento de equipos de cómputo",
            "labelEn": "Computer hardware maintenance",
            "escoLabel": "maintain computer hardware",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "mantenimiento de computadoras",
                "mantenimiento de equipos",
                "reparacion de equipos",
                "hardware",
                "instalacion de hardware"
            ]
        },
        {
            "id": "PA-IT-0003",
            "labelEs": "Redes y conectividad básica",
            "labelEn": "Basic networking and connectivity",
            "escoLabel": "maintain computer network",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "redes",
                "tcp/ip",
                "tcp ip",
                "cableado estructurado",
                "configuracion de red",
                "conectividad"
            ]
        },
        {
            "id": "PA-IT-0004",
            "labelEs": "Sistemas operativos Windows",
            "labelEn": "Windows operating systems",
            "escoLabel": "use operating systems",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "windows",
                "windows 10",
                "windows 11",
                "sistema operativo windows"
            ]
        },
        {
            "id": "PA-OFF-0001",
            "labelEs": "Paquete de oficina",
            "labelEn": "Office productivity suite",
            "escoLabel": "use office software",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "microsoft office",
                "ofimatica",
                "paquete office",
                "word",
                "powerpoint",
                "google workspace"
            ]
        },
        {
            "id": "PA-OFF-0002",
            "labelEs": "Hoja de cálculo Excel",
            "labelEn": "Spreadsheet software",
            "escoLabel": "manage spreadsheets",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "excel",
                "hojas de calculo",
                "excel intermedio",
                "excel avanzado"
            ]
        },
        {
            "id": "PA-OFF-0003",
            "labelEs": "Digitación de datos",
            "labelEn": "Data entry",
            "escoLabel": "enter data",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "digitacion",
                "captura de datos",
                "ingreso de datos",
                "data entry",
                "transcripcion de datos"
            ]
        },
        {
            "id": "PA-OFF-0004",
            "labelEs": "Gestión de agenda y correspondencia",
            "labelEn": "Scheduling and correspondence management",
            "escoLabel": "manage schedules",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "manejo de agenda",
                "agenda",
                "gestion de correspondencia",
                "recepcion de documentos",
                "archivo"
            ]
        },
        {
            "id": "PA-CS-0001",
            "labelEs": "Atención al cliente",
            "labelEn": "Customer service",
            "escoLabel": "provide customer service",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "atencion al cliente",
                "servicio al cliente",
                "customer service",
                "atencion al usuario",
                "trato con clientes",
                "servicio al usuario"
            ]
        },
        {
            "id": "PA-CS-0002",
            "labelEs": "Manejo de caja",
            "labelEn": "Cash handling",
            "escoLabel": "handle cash",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "manejo de caja",
                "caja",
                "manejo de efectivo",
                "cuadre de caja",
                "cash handling"
            ]
        },
        {
            "id": "PA-CS-0003",
            "labelEs": "Ventas y cierre de ventas",
            "labelEn": "Sales and closing",
            "escoLabel": "sell products",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "ventas",
                "sales",
                "cierre de ventas",
                "promocion de productos"
            ]
        },
        {
            "id": "PA-CS-0004",
            "labelEs": "Gestión de relación con clientes (CRM)",
            "labelEn": "Customer relationship management",
            "escoLabel": "manage customer relationships",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "crm",
                "gestion de clientes",
                "sistema crm",
                "salesforce",
                "hubspot"
            ]
        },
        {
            "id": "PA-CS-0005",
            "labelEs": "Telemercadeo y centro de llamadas",
            "labelEn": "Telemarketing and call center",
            "escoLabel": "answer customer calls",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "call center",
                "centro de llamadas",
                "telemercadeo",
                "atencion telefonica",
                "telefono"
            ]
        },
        {
            "id": "PA-CS-0006",
            "labelEs": "Inventario y control de existencias",
            "labelEn": "Inventory control",
            "escoLabel": "manage stock",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "inventario",
                "control de inventario",
                "manejo de inventario",
                "existencias",
                "stock"
            ]
        },
        {
            "id": "PA-CS-0007",
            "labelEs": "Punto de venta (POS)",
            "labelEn": "Point of sale operation",
            "escoLabel": "operate point of sale",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "punto de venta",
                "pos",
                "terminal punto de venta",
                "tpv"
            ]
        },
        {
            "id": "PA-SOFT-0001",
            "labelEs": "Comunicación escrita",
            "labelEn": "Written communication",
            "escoLabel": "communicate in writing",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "comunicacion escrita",
                "redaccion",
                "escritura clara",
                "written communication"
            ]
        },
        {
            "id": "PA-SOFT-0002",
            "labelEs": "Comunicación oral",
            "labelEn": "Verbal communication",
            "escoLabel": "communicate verbally",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "comunicacion oral",
                "comunicacion efectiva",
                "expresion oral",
                "verbal communication"
            ]
        },
        {
            "id": "PA-SOFT-0003",
            "labelEs": "Trabajo en equipo",
            "labelEn": "Teamwork",
            "escoLabel": "work in teams",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "trabajo en equipo",
                "teamwork",
                "colaboracion"
            ]
        },
        {
            "id": "PA-SOFT-0004",
            "labelEs": "Resolución de problemas",
            "labelEn": "Problem solving",
            "escoLabel": "solve problems",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "resolucion de problemas",
                "problem solving",
                "capacidad de analisis",
                "pensamiento critico"
            ]
        },
        {
            "id": "PA-SOFT-0005",
            "labelEs": "Gestión del tiempo",
            "labelEn": "Time management",
            "escoLabel": "manage time",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "gestion del tiempo",
                "organizacion del tiempo",
                "time management",
                "puntualidad"
            ]
        },
        {
            "id": "PA-SOFT-0006",
            "labelEs": "Atención al detalle",
            "labelEn": "Attention to detail",
            "escoLabel": "pay attention to detail",
            "escoUri": null,
            "kind": "skill",
            "aliases": [
                "atencion al detalle",
                "detalle",
                "minuciosidad",
                "attention to detail",
                "cuidado con los detalles"
            ]
        },
        {
            "id": "PA-LANG-0001",
            "labelEs": "Idioma español",
            "labelEn": "Spanish language",
            "escoLabel": "Spanish",
            "escoUri": null,
            "kind": "language",
            "aliases": [
                "espanol",
                "spanish",
                "idioma espanol"
            ]
        },
        {
            "id": "PA-LANG-0002",
            "labelEs": "Idioma inglés",
            "labelEn": "English language",
            "escoLabel": "English",
            "escoUri": null,
            "kind": "language",
            "aliases": [
                "ingles",
                "english",
                "idioma ingles",
                "bilingue"
            ]
        }
    ]
};
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__06jcn4tld_b_n._.js.map