import 'server-only';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { BookingError } from './types';
import type { SchedulingState, SchedulingRecord } from './scheduling-state';
import type { VerificationMail } from './gmail';
const duration=10*60000;
export function createAppointmentVerification(state:SchedulingState,mail:VerificationMail,secret:string,clock=()=>Date.now()) {
  const hmac=(s:string)=>createHmac('sha256',secret).update(s).digest('hex');
  async function allowance(key:string,owner:string,maximum:number,window:number){
    for(let attempt=0;attempt<5;attempt++){
      const old=await state.get(key,owner);
      const count=old&&Number(old.payload.until)>clock()?Number(old.payload.count):0;
      if(count>=maximum)throw new BookingError(429,'Please wait before requesting another verification code.');
      const until=count?Number(old!.payload.until):clock()+window;
      const payload={count:count+1,until};
      if(old?await state.replace(old,payload):await state.insert({key,owner_hash:owner,kind:'rate',payload,version:0,expires_at:new Date(until).toISOString()}))return;
    }throw new BookingError(429,'Please wait before trying again.');
  }
  return {
    async request(owner:string,email:string){
      email=email.trim().toLowerCase();
      if(email.length>254||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))throw new BookingError(400,'Please provide a valid email address.');
      const verified=await this.email(owner).catch(error=>{if(error instanceof BookingError&&error.status===403)return null;throw error;});
      if(verified===email)return {status:'verified',message:'Your booking email is already verified for this session.'};
      await allowance('otp-owner:'+owner,owner,3,3600000);
      const address=hmac('email:'+email);
      // Global per-address limit also holds across different browser sessions.
      await allowance('otp-email:'+address,address,3,3600000);
      const id=randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0');
      const record:SchedulingRecord={key:'verification:'+owner,owner_hash:owner,kind:'verification',version:0,expires_at:new Date(clock()+duration).toISOString(),payload:{id,email,verifier:hmac(`${owner}:${id}:${code}`),attempts:0,status:'sending'}};
      const old=await state.get(record.key,owner);
      if(old){if(!await state.replace(old,record.payload))throw new BookingError(409,'A verification request is already in progress.');record.version=old.version+1;record.expires_at=old.expires_at;}
      else if(!await state.insert(record))throw new BookingError(409,'A verification request is already in progress.');
      // expiry is also inside payload so subsequent challenges can safely replace a row.
      const payload={...record.payload,until:clock()+duration};
      try {await mail.send(email,code);}catch {await state.replace(record,{...payload,status:'failed',verifier:null});throw new BookingError(503,'Verification email could not be sent. Please try again later.');}
      if(!await state.replace(record,{...payload,status:'sent'}))throw new BookingError(409,'Please request a new verification code.');
      return {status:'verification_required',message:'A verification code was accepted for delivery. Enter it in the secure field below.'};
    },
    async pending(owner:string){const r=await state.get('verification:'+owner,owner);return r?.payload.status==='sent'&&Number(r.payload.until)>clock();},
    async verify(owner:string,code:string){
      if(!/^\d{6}$/.test(code))throw new BookingError(400,'Enter the six-digit code in the secure field.');
      for(let attempt=0;attempt<5;attempt++){
        const r=await state.get('verification:'+owner,owner);
        if(!r||r.payload.status!=='sent'||Number(r.payload.until)<=clock()||Number(r.payload.attempts)>=5)throw new BookingError(400,'That code is unavailable or expired. Please request a new code.');
        const actual=hmac(`${owner}:${r.payload.id}:${code}`),expected=String(r.payload.verifier);
        const correct=expected.length===actual.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(actual));
        if(!await state.replace(r,{...r.payload,attempts:Number(r.payload.attempts)+1,status:correct?'used':'sent',verifier:correct?null:expected}))continue;
        if(!correct)throw new BookingError(400,'That code did not match. Please check the email and try again.');
        const identity={email:r.payload.email,until:clock()+15*60000};
        const old=await state.get('identity:'+owner,owner);
        const ok=old?await state.replace(old,identity):await state.insert({key:'identity:'+owner,owner_hash:owner,kind:'identity',payload:identity,version:0,expires_at:new Date(clock()+15*60000).toISOString()});
        if(!ok)throw new BookingError(409,'Please verify again.');
        return {status:'verified'};
      }throw new BookingError(429,'Please wait before trying again.');
    },
    async email(owner:string){const r=await state.get('identity:'+owner,owner);if(!r||Number(r.payload.until)<=clock()||typeof r.payload.email!=='string')throw new BookingError(403,'Please verify your booking email first.');return r.payload.email;},
    async blockCodeInChat(owner:string,message:string){if(/^\s*\d{6}\s*$/.test(message)||(await this.pending(owner)&&/\b\d{6}\b/.test(message)))throw new BookingError(400,'Enter verification codes only in the secure code field, never in chat.');},
  };
}
