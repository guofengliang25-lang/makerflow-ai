import {randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createModelProviderAdapter} from "../prototype/provider-adapter.js";
import {createDeepSeekModelProvider} from "./deepseek-model-provider.js";
import {validateJsonSchema} from "./json-schema-validator.js";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const promptPath=join(root,"prompts","brief.ask_missing","v0.1.md"),schemaPath=join(root,"schemas","brief_ask_missing.schema.json");
const block=md=>md.match(/```text\r?\n([\s\S]*?)\r?\n```/)?.[1];
export async function executeBriefAskMissing({structuredInput,env=process.env,fetchImpl=globalThis.fetch,runId=randomUUID()}={}){
  const schema=JSON.parse(await readFile(schemaPath,"utf8")),template=block(await readFile(promptPath,"utf8"));
  const prompt=template.replace("{{structured_input_json}}",JSON.stringify(structuredInput,null,2)).replace("{{output_schema_json}}",JSON.stringify(schema,null,2));
  const adapter=createModelProviderAdapter({providers:{deepseek:createDeepSeekModelProvider({env,fetchImpl})},schemaValidator:validateJsonSchema});
  const result=await adapter.invoke({skill_id:"brief.ask_missing",messages:[{role:"system",content:prompt}],structured_input:structuredInput,schema,model_config:{provider_name:"deepseek",model_name:"deepseek-chat",temperature:0},trace_metadata:{skill_id:"brief.ask_missing",run_id:runId,prompt_version:"v0.1"}});
  const trace={provider_name:result.provider_name,model_name:result.model_name,prompt_version:"v0.1",run_id:runId,latency_ms:result.latency_ms,parse_status:result.parse_status,schema_validation:result.schema_validation?.status||"not_run"};
  if(result.error)return{ok:false,error:result.error,trace};
  const allowed=new Set([...(structuredInput.missing_items||[]),...(structuredInput.conflict_items||[])]);
  const questions=result.parsed_output.clarifying_questions;
  if(questions.some(q=>!allowed.has(q.field_id)))return{ok:false,error:{code:"QUESTION_SCOPE_INVALID",message:"Question targets a field not selected by Rule."},trace};
  if(questions.some(q=>/A6|默认|建议|推荐/.test(q.question)))return{ok:false,error:{code:"QUESTION_POLICY_INVALID",message:"Question contains a default or recommendation."},trace};
  return{ok:true,skill_id:"brief.ask_missing",clarifying_questions:questions,trace};
}
