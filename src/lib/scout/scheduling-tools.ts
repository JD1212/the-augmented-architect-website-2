import 'server-only';
import { tool } from '@openai/agents';
import { BookingError } from '@/lib/booking/types';
import type { createSchedulingService } from '@/lib/booking/scheduling';
export type SchedulingContext={ownerHash:string;signal:AbortSignal};
type Scheduling=ReturnType<typeof createSchedulingService>;
// JSON Schema is supported by the installed SDK. Business inputs are validated again by the service.
const text={type:'string'} as const, nullable={type:['string','null']} as const;
function args(value:unknown){if(!value||typeof value!=='object'||Array.isArray(value))throw new BookingError(400,'Invalid scheduling arguments.');return value as Record<string,string|null>;}
export function createSchedulingTools(service:Scheduling){
  function registered(name:string,description:string,properties:Record<string,unknown>,execute:(input:Record<string,string|null>,owner:string)=>Promise<unknown>){
    return tool({name,description,parameters:{type:'object',properties,required:Object.keys(properties),additionalProperties:false},strict:true,
      async execute(input,context){
        const scope=context?.context as SchedulingContext|undefined;
        if(!scope?.ownerHash||scope.signal.aborted)return {status:'error',message:'Scheduling authorization is unavailable.'};
        try{return await execute(args(input),scope.ownerHash);}catch(error){return {status:'error',message:error instanceof BookingError?error.message:'Scheduling is temporarily unavailable. Retry the same operation.'};}
      },errorFunction:()=>JSON.stringify({status:'error',message:'The scheduling request was invalid. Please check its details.'})});
  }
  return [
    registered('check_consultation_availability','Return real available 30-minute consultations for one Costa Rica calendar date. Never includes private event details.',{date:text,timezone:nullable,appointmentId:nullable},async (i,owner)=>({status:'available',date:i.date,timezone:'America/Costa_Rica',slots:await service.availability(String(i.date),owner,i.appointmentId)})),
    registered('prepare_consultation_booking','Validate name/email/selected slot and create a session-owned proposal. Does not book. Requires explicit application confirmation.',{name:text,email:text,start:text,timezone:text,description:text},async(i,owner)=>({status:'confirmation_required',proposal:await service.prepareBooking(owner,{name:String(i.name),email:String(i.email),start:String(i.start),timezone:String(i.timezone),description:String(i.description)})})),
    registered('confirm_consultation_booking','Execute only an application-approved proposal. Textual assent never authorizes booking. Retry the same proposal after pending results.',{proposalId:text},(i,owner)=>service.confirmBooking(owner,String(i.proposalId))),
    registered('request_appointment_verification','Send a verification code to the booking email. Does not disclose whether appointments exist. Code must be entered in the secure UI, never chat.',{email:text},(i,owner)=>service.verification.request(owner,String(i.email))),
    registered('get_verified_appointments','Return upcoming consultations only for the server-verified email. No model-selected owner is accepted.',{},(_,owner)=>service.appointments(owner)),
    registered('cancel_consultation','Prepare cancellation with appointmentId and null proposalId. After application confirmation execute with the same proposalId; backend checks verified ownership.',{appointmentId:text,proposalId:nullable},(i,owner)=>service.change(owner,'cancel',String(i.appointmentId),null,i.proposalId)),
    registered('reschedule_consultation','Prepare rescheduling of a verified appointment to an available ISO start with null proposalId. Execute only after application confirmation using proposalId.',{appointmentId:text,start:text,proposalId:nullable},(i,owner)=>service.change(owner,'reschedule',String(i.appointmentId),String(i.start),i.proposalId)),
  ];
}
