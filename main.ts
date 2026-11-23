import{readdirSync,readFileSync,mkdirSync,writeFileSync}from"node:fs";
import{join}from"node:path";
const I=process.env.MAKEFUN_INPUT_DIR??"/input",O=process.env.MAKEFUN_OUTPUT_DIR??"/output";
function run(p:Buffer,b:Buffer){
let pc=0,sp=0,cs=0,ip=0,ol=0,n=0;
const S=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),U=new Uint8Array(65536);
const T=(e:number):never=>{throw e};
const pop=()=>{if(sp<1)T(2);return S[--sp]};
const push=(v:number)=>{if(sp>255)T(3);S[sp++]=v|0};
const im=(k:number)=>{if(pc+k>=p.length)T(9);return k<2?p[pc+1]:k<3?p[pc+1]|p[pc+2]<<8:p[pc+1]|p[pc+2]<<8|p[pc+3]<<16|p[pc+4]<<24};
try{for(;;){
if(n>=1e6)T(10);
if(pc<0||pc>=p.length)T(9);
const o=p[pc];n++;
switch(o){
case 0:return[U.subarray(0,ol),0];
case 1:push(im(1)<<24>>24);pc+=2;break;
case 2:push(im(4));pc+=5;break;
case 3:pop();pc++;break;
case 4:if(sp<1)T(2);if(sp>255)T(3);S[sp]=S[sp-1];sp++;pc++;break;
case 5:{const x=pop(),y=pop();push(x);push(y);pc++;break;}
case 6:if(sp<2)T(2);if(sp>255)T(3);S[sp]=S[sp-2];sp++;pc++;break;
case 7:{if(sp<3)T(2);const x=S[sp-3],y=S[sp-2],z=S[sp-1];S[sp-3]=y;S[sp-2]=z;S[sp-1]=x;pc++;break;}
case 16:{const y=pop(),x=pop();push(x+y);pc++;break;}
case 17:{const y=pop(),x=pop();push(x-y);pc++;break;}
case 18:{const y=pop(),x=pop();push(Math.imul(x,y));pc++;break;}
case 19:{const y=pop(),x=pop();if(!y)T(4);push(x===-2147483648&&y===-1?x:(x/y)|0);pc++;break;}
case 20:{const y=pop(),x=pop();if(!y)T(4);push(y===-1?0:x%y|0);pc++;break;}
case 21:{const y=pop(),x=pop();if(!y)T(4);push(Math.floor((x>>>0)/(y>>>0))|0);pc++;break;}
case 22:{const y=pop(),x=pop();if(!y)T(4);push((x>>>0)%(y>>>0)|0);pc++;break;}
case 23:push(-pop());pc++;break;
case 24:{const y=pop(),x=pop();push(x&y);pc++;break;}
case 25:{const y=pop(),x=pop();push(x|y);pc++;break;}
case 26:{const y=pop(),x=pop();push(x^y);pc++;break;}
case 27:push(~pop());pc++;break;
case 28:{const y=pop(),x=pop();push(x<<(y&31));pc++;break;}
case 29:{const y=pop(),x=pop();push(x>>(y&31));pc++;break;}
case 30:{const y=pop(),x=pop();push((x>>>(y&31))|0);pc++;break;}
case 32:{const y=pop(),x=pop();push(x===y?1:0);pc++;break;}
case 33:{const y=pop(),x=pop();push(x<y?1:0);pc++;break;}
case 34:{const y=pop(),x=pop();push((x>>>0)<(y>>>0)?1:0);pc++;break;}
case 48:{const f=(im(2)<<16)>>16;pc=pc+3+f;break;}
case 49:{const f=(im(2)<<16)>>16,v=pop();pc=v===0?pc+3+f:pc+3;break;}
case 50:{const f=(im(2)<<16)>>16,v=pop();pc=v!==0?pc+3+f:pc+3;break;}
case 51:{const t=im(2);if(cs>63)T(7);C[cs++]=pc+3;pc=t;break;}
case 52:if(cs<1)T(8);pc=C[--cs];break;
case 64:{const a=pop();if(a<0||a>255)T(6);push(M[a]);pc++;break;}
case 65:{const a=pop(),v=pop();if(a<0||a>255)T(6);M[a]=v;pc++;break;}
case 80:{const v=pop(),s=String(v);if(ol+s.length>65536)T(11);for(let i=0;i<s.length;i++)U[ol++]=s.charCodeAt(i);pc++;break;}
case 81:{const v=pop();if(ol>65535)T(11);U[ol++]=v&255;pc++;break;}
case 82:push(ip<b.length?b[ip++]:-1);pc++;break;
case 83:{const v=pop();return[U.subarray(0,ol),v&255];}
default:T(5);
}
}}catch(e){return[U.subarray(0,ol),Number(e)];}
}
for(const id of readdirSync(I).sort()){
const r=run(readFileSync(join(I,id,"program.bin")),readFileSync(join(I,id,"input.bin")));
mkdirSync(join(O,id),{recursive:true});
writeFileSync(join(O,id,"stdout.bin"),r[0]);
writeFileSync(join(O,id,"exit.txt"),r[1]+"\n");
}
