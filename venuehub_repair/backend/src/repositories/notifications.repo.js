const { v4: uuid } = require("uuid");
const { query } = require("../database");
function toNotification(r){if(!r)return null;return{id:r.id,userId:r.user_id,type:r.type,title:r.title,message:r.message,link:r.link,read:Boolean(r.is_read),createdAt:r.created_at};}
async function create({userId,type="INFO",title,message="",link=""},client){const row={id:uuid(),user_id:userId,type,title,message,link};const{rows}=await query(`INSERT INTO notifications (id,user_id,type,title,message,link,is_read) VALUES ($1,$2,$3,$4,$5,$6,false) RETURNING *`,[row.id,row.user_id,row.type,row.title,row.message,row.link],client);return toNotification(rows[0]);}
async function listForUser(userId,{limit=30}={}){const{rows}=await query(`SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,[userId,limit]);const unread=await query(`SELECT COUNT(*)::int AS n FROM notifications WHERE user_id=$1 AND is_read=false`,[userId]);return{notifications:rows.map(toNotification),unread:Number(unread.rows[0]?.n||0)};}
async function markRead(userId,id){const r=await query("UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2",[id,userId]);return r.rowCount>0;}
async function markAllRead(userId){const r=await query("UPDATE notifications SET is_read=true WHERE user_id=$1",[userId]);return r.rowCount;}
async function clear(userId){const r=await query("DELETE FROM notifications WHERE user_id=$1",[userId]);return r.rowCount;}
async function notifyAdmins(payload,client){const{rows}=await query("SELECT id FROM users WHERE role IN ('ADMIN','SUPER_ADMIN')",[],client);for(const a of rows)await create({...payload,userId:a.id},client);return rows.length;}
module.exports={create,listForUser,markRead,markAllRead,clear,notifyAdmins};
