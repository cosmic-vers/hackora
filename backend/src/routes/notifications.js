const express=require("express");const repo=require("../repositories/notifications.repo");const {authenticate}=require("../middleware/auth");const {asyncHandler,notFound}=require("../middleware/errors");const router=express.Router();
router.get("/",authenticate,asyncHandler(async(req,res)=>res.json(await repo.listForUser(req.user.id,{limit:Math.min(50,Number(req.query.limit)||30)}))));
router.patch("/:id/read",authenticate,asyncHandler(async(req,res)=>{if(!await repo.markRead(req.user.id,req.params.id))throw notFound("Notification not found.");res.json({message:"Notification marked as read."});}));
router.patch("/read-all",authenticate,asyncHandler(async(req,res)=>res.json({count:await repo.markAllRead(req.user.id)})));
router.delete("/",authenticate,asyncHandler(async(req,res)=>res.json({count:await repo.clear(req.user.id)})));
module.exports=router;
