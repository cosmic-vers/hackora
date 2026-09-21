const { query } = require("./database");
const { v4: uuid } = require("uuid");

const VENUES = [
  {name:"Grand Celebration Hall",type:"Function Hall",location:"Central District",capacity:600,amenities:["Stage","Projector","Sound System","Air Conditioning","Green Room","Parking","Catering Access"],description:"A premium large-capacity hall for weddings, receptions, conferences and major celebrations.",image:"auditorium",openTime:"08:00",closeTime:"23:00",basePrice:25000,priceUnit:"event"},
  {name:"Signature Banquet Hall",type:"Banquet Hall",location:"West Avenue",capacity:300,amenities:["Stage","Sound System","Air Conditioning","Decoration Points","Catering Access","Parking"],description:"Elegant multipurpose hall for receptions, birthdays, corporate gatherings and social events.",image:"function",openTime:"09:00",closeTime:"23:00",basePrice:16000,priceUnit:"event"},
  {name:"Innovation Conference Centre",type:"Conference Centre",location:"Business Park",capacity:220,amenities:["Projector","Whiteboard","Air Conditioning","Video Conferencing","Wi-Fi","Parking"],description:"Professional venue for conferences, workshops, launches, panels and training sessions.",image:"seminar",openTime:"07:00",closeTime:"21:00",basePrice:12000,priceUnit:"hour"},
  {name:"Rooftop Celebration Deck",type:"Rooftop Venue",location:"East Wing",capacity:180,amenities:["Open Air","Lighting Rig","Sound System","Catering Access","City View"],description:"Open-air setting for birthdays, receptions, private parties and sunset events.",image:"outdoor",openTime:"15:00",closeTime:"23:00",basePrice:10000,priceUnit:"event"},
  {name:"Boardroom One",type:"Meeting Room",location:"Business Park",capacity:30,amenities:["Video Conferencing","Whiteboard","Air Conditioning","Wi-Fi"],description:"Private room for leadership meetings, interviews, workshops and small team sessions.",image:"boardroom",openTime:"08:00",closeTime:"20:00",basePrice:1800,priceUnit:"hour"},
  {name:"Community Event Studio",type:"Community Hall",location:"North Market",capacity:100,amenities:["Projector","Sound System","Flexible Seating","Catering Access","Wi-Fi"],description:"Flexible community venue for celebrations, classes, community events and local gatherings.",image:"classroom",openTime:"08:00",closeTime:"21:00",basePrice:6500,priceUnit:"event"},
];

const SERVICE_TEMPLATES = [
 ["Premium Catering","CATERING","Signature Catering Co.",6500],
 ["Event Decoration","DECORATION","Celebration Studio",5000],
 ["Professional Photography","PHOTOGRAPHY","FrameWorks Media",4500],
 ["Sound & AV System","TECHNICAL","StageTech Services",2800],
 ["Seating Arrangement","SEATING","Event Setup Crew",1500],
 ["Professional Cleaning","CLEANING","CleanSpace Services",900],
 ["Security Staff","SECURITY","SecureEvent Services",1800],
 ["Electrical & Lighting","ELECTRICAL","PowerWorks Events",2200],
];

async function seed(){
  const count=await query("SELECT COUNT(*)::int AS n FROM venues");
  if(Number(count.rows[0].n)===0){
    for(const v of VENUES){await query(`INSERT INTO venues (id,name,type,location,capacity,amenities,description,image,status,open_time,close_time,base_price,price_unit,photos) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,'ACTIVE',$9,$10,$11,$12,$13::jsonb)`,[uuid(),v.name,v.type,v.location,v.capacity,JSON.stringify(v.amenities),v.description,v.image,v.openTime,v.closeTime,v.basePrice,v.priceUnit,JSON.stringify([`https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=82`,`https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=82`])]);}
    console.log(`[seed] Added ${VENUES.length} sample venues.`);
  }
  const serviceCount=await query("SELECT COUNT(*)::int AS n FROM venue_services");
  if(Number(serviceCount.rows[0].n)===0){const venues=(await query("SELECT id FROM venues")).rows;for(const venue of venues){for(const [name,category,provider,rate] of SERVICE_TEMPLATES){await query(`INSERT INTO venue_services (id,venue_id,name,category,provider_name,rate,billing_unit,scope,status) VALUES ($1,$2,$3,$4,$5,$6,'event','Event-day support','ACTIVE')`,[uuid(),venue.id,name,category,provider,rate]);}}console.log("[seed] Added support services for all venues.");}
}
module.exports=seed;
if(require.main===module){require("./database").initSchema().then(seed).then(()=>require("./database").close()).catch(e=>{console.error(e);process.exit(1);});}
