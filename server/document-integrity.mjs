import {createHash} from 'node:crypto';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const parsedDigest=source=>digest(JSON.stringify({parserVersion:source.parserVersion,text:source.text,documentBlocks:source.documentBlocks,financialFacts:source.financialFacts,pageQuality:source.pageQuality,qualitySummary:source.qualitySummary,truncated:source.truncated,inlineXbrl:source.inlineXbrl,...(source.visualReading?{visualReading:source.visualReading}:{})}));
export const validParsedArchive=source=>typeof source?.text==='string'&&digest(source.text)===source.textSha256&&(!source.parsedSha256||parsedDigest(source)===source.parsedSha256);
