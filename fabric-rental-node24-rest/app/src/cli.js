import { newContract } from './connect.js';
const command = process.argv[2];
const args = process.argv.slice(3);
async function main(){
  const {contract, close}=await newContract();
  try{
    switch(command){
      case 'init': await submit(contract,'InitLedger'); break;
      case 'list': await evaluate(contract,'GetAllCars'); break;
      case 'available': await evaluate(contract,'GetAvailableCars'); break;
      case 'read': requireArgs(args,1,'Usage: npm run read -- CAR001'); await evaluate(contract,'ReadCar',args[0]); break;
      case 'create': requireArgs(args,7,'Usage: npm run create -- CAR004 "宇都宮300あ1234" Toyota Yaris 2024 COMPACT 1000'); await submit(contract,'CreateCar',...args.slice(0,7)); break;
      case 'rent': requireArgs(args,6,'Usage: npm run rent -- CAR004 CUST001 "山田太郎" "090-0000-0000" "2026-06-10T10:00:00+09:00" "2026-06-10T18:00:00+09:00"'); await submit(contract,'RentCar',...args.slice(0,6)); break;
      case 'return': requireArgs(args,3,'Usage: npm run return -- CAR004 1120 "2026-06-10T17:30:00+09:00"'); await submit(contract,'ReturnCar',args[0],args[1],args[2]); break;
      case 'delete': requireArgs(args,1,'Usage: npm run delete -- CAR004'); await submit(contract,'DeleteCar',args[0]); break;
      default: printHelp(); process.exitCode=1;
    }
  } finally { close(); }
}
async function evaluate(contract,name,...txArgs){ printResult(await contract.evaluateTransaction(name,...txArgs)); }
async function submit(contract,name,...txArgs){ printResult(await contract.submitTransaction(name,...txArgs)); }
function printResult(resultBytes){ const text=Buffer.from(resultBytes).toString('utf8'); if(!text){console.log('(no result)');return;} try{console.log(JSON.stringify(JSON.parse(text),null,2));}catch{console.log(text);} }
function requireArgs(args,count,usage){ if(args.length<count) throw new Error(usage); }
function printHelp(){ console.log(`Usage:
  npm run init
  npm run list
  npm run available
  npm run read -- CAR001
  npm run create -- CAR004 "宇都宮300あ1234" Toyota Yaris 2024 COMPACT 1000
  npm run rent -- CAR004 CUST001 "山田太郎" "090-0000-0000" "2026-06-10T10:00:00+09:00" "2026-06-10T18:00:00+09:00"
  npm run return -- CAR004 1120 "2026-06-10T17:30:00+09:00"
  npm run delete -- CAR004`); }
main().catch((error)=>{ console.error(error); process.exitCode=1; });
