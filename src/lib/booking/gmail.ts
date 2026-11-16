import 'server-only';
import { BookingError } from './types';
export interface VerificationMail { send(email:string,code:string):Promise<void> }
export function createGmailVerification(env:NodeJS.ProcessEnv=process.env,request:typeof fetch=fetch):VerificationMail {
  return {async send(email,code){
    if(env.SCOUT_VERIFICATION_EMAIL_ENABLED!=='true'||!env.GOOGLE_GMAIL_REFRESH_TOKEN||!env.GOOGLE_CALENDAR_CLIENT_ID||!env.GOOGLE_CALENDAR_CLIENT_SECRET)throw new BookingError(503,'Email verification is not available yet. Please use Contact for appointment changes.');
    if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||/[\r\n]/.test(email)||!/^\d{6}$/.test(code))throw new BookingError(400,'Invalid verification request.');
    const response=await request('https://oauth2.googleapis.com/token',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_CALENDAR_CLIENT_ID,client_secret:env.GOOGLE_CALENDAR_CLIENT_SECRET,refresh_token:env.GOOGLE_GMAIL_REFRESH_TOKEN,grant_type:'refresh_token'})});
    if(!response.ok)throw new BookingError(503,'Verification email is temporarily unavailable.');
    const data=await response.json();
    if(typeof data.access_token!=='string'||!String(data.scope??'').split(' ').includes('https://www.googleapis.com/auth/gmail.send'))throw new BookingError(503,'Verification email authorization is unavailable.');
    // No inbox/read permissions. The owner helper verifies the approved account.
    const raw=Buffer.from(['From: The Augmented Architect <jd@theaugmentedarchitect.com>',`To: ${email}`,'Subject: Your Scout appointment verification code','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','','Your Scout appointment verification code is: '+code,'','This code expires in 10 minutes and can be used once. Enter it only in the secure code field on our website, never in chat.','If you did not request this code, ignore this email.'].join('\r\n')).toString('base64url');
    const sent=await request('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${data.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({raw})});
    if(!sent.ok)throw new BookingError(503,'Verification email could not be sent. Please try later.');
    const result=await sent.json();if(typeof result.id!=='string')throw new BookingError(503,'Verification email delivery could not be confirmed.');
  }};
}
