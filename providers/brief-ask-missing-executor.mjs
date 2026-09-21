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
const FIELD_REASONS={
  material_direction:"材料会直接影响加工方式、耐久性和成品表现。",
  material:"材料会直接影响加工方式、耐久性和成品表现。",
  process:"工艺会决定作品是否能够按预期制作。",
  manufacturing_process:"工艺会决定作品是否能够按预期制作。",
  finished_size:"尺寸会直接影响版式布局和制作可行性。",
  dimensions:"尺寸会直接影响版式布局和制作可行性。",
  purpose:"使用场景会影响结构、耐用性和加工取舍。",
  use_case:"使用场景会影响结构、耐用性和加工取舍。",
  must_content:"必须表达的内容会影响最终方案是否完整。",
  product_facts:"需要表达的产品事实必须可追溯，避免虚构。",
  engraving_content:"刻字内容必须明确，才能生成可制作的版面。",
  text_content:"具体文字内容会直接影响版面和加工结果。",
  brand_name:"品牌名称必须准确，才能进入最终作品。",
  special_requirements:"特殊要求会影响方案和加工约束。",
  deliverable:"交付物类型会影响最终制造表达。"
};
const TEXT_FIELDS=new Set(["engraving_content","text_content","brand_name","special_requirements"]);
const QUESTION_FIELDS=new Set(["material_direction","material","process","manufacturing_process","finished_size","dimensions","size","purpose","use_case","usage","engraving_content","text_content","brand_name","special_requirements","must_content","content","form","style","color_direction"]);
const FIELD_PRIORITY=["material_direction","material","process","manufacturing_process","finished_size","dimensions","size","purpose","use_case","usage","engraving_content","text_content","brand_name","special_requirements","must_content","content","style","form","color_direction"];
function rankedMissingItems(input={}){
  const rank=new Map(FIELD_PRIORITY.map((id,index)=>[id,index]));
  return [...new Set([...(input.missing_items||[]),...(input.conflict_items||[])])].filter(field=>QUESTION_FIELDS.has(field)).sort((a,b)=>(rank.get(a)??99)-(rank.get(b)??99));
}
function buildMissingFields(input={}){
  return rankedMissingItems(input).map((field,index)=>({field,importance:index<2?"P0":index<5?"P1":"P2",reason:FIELD_REASONS[field]||"该信息仍会影响当前作品的设计决策。"}));
}
export async function executeBriefAskMissing({structuredInput,env=process.env,fetchImpl=globalThis.fetch,runId=randomUUID(),retryAttempt=0}={}){
  const missingFields=buildMissingFields(structuredInput);
  if(!missingFields.length)return{ok:true,status:"READY_TO_GENERATE",skill_id:"brief.ask_missing",brief:{known_fields:[]},missing_fields:[],questions:[],clarifying_questions:[],completion_status:{complete:true,missing_fields:[]},trace:{provider_name:"deepseek",model_name:"deepseek-chat",prompt_version:"v0.1",run_id:runId,parse_status:"not_called",schema_validation:"not_run"}};
  const schema=JSON.parse(await readFile(schemaPath,"utf8")),template=block(await readFile(promptPath,"utf8"));
  const prompt=template.replace("{{structured_input_json}}",JSON.stringify(structuredInput,null,2)).replace("{{output_schema_json}}",JSON.stringify(schema,null,2));
  const adapter=createModelProviderAdapter({providers:{deepseek:createDeepSeekModelProvider({env,fetchImpl})},schemaValidator:validateJsonSchema});
  const result=await adapter.invoke({skill_id:"brief.ask_missing",messages:[{role:"system",content:prompt}],structured_input:structuredInput,schema,model_config:{provider_name:"deepseek",model_name:"deepseek-chat",temperature:0},trace_metadata:{skill_id:"brief.ask_missing",run_id:runId,prompt_version:"v0.1"}});
  const trace={provider_name:result.provider_name,model_name:result.model_name,prompt_version:"v0.1",run_id:runId,latency_ms:result.latency_ms,parse_status:result.parse_status,schema_validation:result.schema_validation?.status||"not_run"};
  if(result.error)return{ok:false,status:"ERROR",error:result.error,trace};
  const retryOrWarning=async error=>{
    if(retryAttempt<1)return executeBriefAskMissing({structuredInput,env,fetchImpl,runId,retryAttempt:retryAttempt+1});
    const warning={code:"QUESTION_GENERATION_WARNING",message:"问题生成连续失败，已跳过澄清并继续生成方案。",detail:error.message};
    return{ok:true,status:"READY_TO_GENERATE",skill_id:"brief.ask_missing",brief:{known_fields:[]},missing_fields:missingFields,questions:[],clarifying_questions:[],completion_status:{complete:true,missing_fields:[],warning},warning,trace};
  };
  const allowed=new Set(missingFields.map(item=>item.field));
  const questions=result.parsed_output.questions||result.parsed_output.clarifying_questions||[];
  const limitedQuestions=questions.filter(q=>allowed.has(q.field_id)).slice(0,3).map(q=>({...q,options:Array.isArray(q.options)?q.options:[],input_type:q.input_type||(Array.isArray(q.options)&&q.options.length?"single_choice":TEXT_FIELDS.has(q.field_id)?"textarea":"single_choice")}));
  if(questions.some(q=>!allowed.has(q.field_id)))return retryOrWarning({code:"QUESTION_SCOPE_INVALID",message:"Question targets a field not selected by Rule."});
  if(questions.some(q=>/A6|默认|建议|推荐/.test(q.question)))return retryOrWarning({code:"QUESTION_POLICY_INVALID",message:"Question contains a default or recommendation."});
  if(limitedQuestions.some(q=>/设计理念|信息层级|阅读引导|视觉辅助|版式风格|为什么要/.test(q.question)))return retryOrWarning({code:"QUESTION_SCOPE_INVALID",message:"问题必须聚焦制造参数，不能询问设计推理。"});
  if(new Set(limitedQuestions.map(q=>q.field_id)).size!==limitedQuestions.length)return retryOrWarning({code:"QUESTION_DUPLICATE",message:"同一字段不能重复提问。"});
  if(limitedQuestions.some(q=>q.input_type==="single_choice"&&(!Array.isArray(q.options)||q.options.length<1||q.options.some(option=>!option||typeof option!=="object"||typeof option.label!=="string"||typeof option.value!=="string"))))return retryOrWarning({code:"QUESTION_OPTIONS_INVALID",message:"选择题必须返回带label和value的options。"});
  if(limitedQuestions.some(q=>q.input_type==="textarea"&&!TEXT_FIELDS.has(q.field_id)))return retryOrWarning({code:"QUESTION_TYPE_INVALID",message:"只有具体文本字段可以使用textarea。"});
  if(!limitedQuestions.length)return retryOrWarning({code:"QUESTION_EMPTY",message:"当前缺失信息暂时无法生成问题。"});
  const known_fields=(structuredInput.brief_candidate?.fields||[]).filter(field=>String(field.value??"").trim()).map(field=>({field:field.id,value:field.value,status:field.status}));
  return{ok:true,status:"NEED_CLARIFICATION",skill_id:"brief.ask_missing",brief:{known_fields},missing_fields:missingFields,questions:limitedQuestions,clarifying_questions:limitedQuestions,completion_status:{complete:false,missing_fields:missingFields.map(item=>item.field)},trace};
}
