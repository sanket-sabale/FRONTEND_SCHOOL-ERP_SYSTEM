import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
export const choice={membershipId:'10000000-0000-4000-8000-000000000001',tenantId:'20000000-0000-4000-8000-000000000001',tenantName:'Test school'};
export const selectionResponse=(now=Date.now())=>({status:'MEMBERSHIP_SELECTION_REQUIRED',selectionToken:randomBytes(64).toString('base64url'),expiresAt:new Date(now+300000).toISOString(),memberships:[choice]});
export function testWrapper(key=randomBytes(32)) {
 return {keyId:'ephemeral-test-only',async wrap(value,aad){const nonce=randomBytes(12),c=createCipheriv('aes-256-gcm',key,nonce);c.setAAD(aad);return Buffer.concat([nonce,c.update(value),c.final(),c.getAuthTag()]);},async unwrap(id,value,aad){if(id!==this.keyId)throw new Error('Unavailable');const d=createDecipheriv('aes-256-gcm',key,value.subarray(0,12));d.setAAD(aad);d.setAuthTag(value.subarray(-16));return Buffer.concat([d.update(value.subarray(12,-16)),d.final()]);}};
}
export function springSuccess(onSelect=()=>{}) {
 return {async call(context,operation,input){if(context!=='TENANT')throw new Error();if(operation==='select-membership'){onSelect(input);return {status:200,body:{accessToken:'test.access.token',refreshToken:'test-refresh',tokenType:'Bearer',expiresInSeconds:600,roles:[],tenantId:choice.tenantId,membershipId:choice.membershipId}};}return {status:200,body:{accountId:'30000000-0000-4000-8000-000000000001',tenantId:choice.tenantId,membershipId:choice.membershipId,roles:[],permissions:[]}};}};
}
