export function resourceSignal(signal, timeoutMs=15000) {
 const timeout=AbortSignal.timeout(timeoutMs);
 return signal?AbortSignal.any([signal,timeout]):timeout;
}

export async function readJSON(path, signal) {
 const response=await fetch(path,{signal:resourceSignal(signal)});
 if(!response.ok)throw Error(path+' · HTTP '+response.status);
 return response.json();
}
