const express = require("express");
const servicesRepo = require("../repositories/services.repo");
const venuesRepo = require("../repositories/venues.repo");
const { authenticate, authorize } = require("../middleware/auth");
const { asyncHandler, notFound } = require("../middleware/errors");
const { check } = require("../utils/validate");

const router = express.Router();

router.get("/", authenticate, asyncHandler((req,res)=>{
  res.json({ services: servicesRepo.list({ venueId:req.query.venueId||"", status:req.query.status||"", category:req.query.category||"" }), categories: servicesRepo.CATEGORIES });
}));

router.post("/", authenticate, authorize("ADMIN"), asyncHandler((req,res)=>{
  const data=check(req.body)
    .string("venueId",{label:"Venue"})
    .string("name",{label:"Service name",min:2,max:100})
    .oneOf("category",servicesRepo.CATEGORIES,{label:"Category"})
    .string("providerName",{label:"Provider name",min:2,max:100})
    .string("role",{label:"Role",required:false,max:80})
    .string("phone",{label:"Phone",required:false,max:30})
    .string("email",{label:"Email",required:false,max:160})
    .string("contractRef",{label:"Contract reference",required:false,max:80})
    .date("contractStart",{label:"Contract start"})
    .date("contractEnd",{label:"Contract end"})
    .integer("rate",{label:"Rate",required:false,min:0,max:10000000})
    .string("billingUnit",{label:"Billing unit",required:false,max:30})
    .string("scope",{label:"Scope",required:false,max:500})
    .oneOf("status",["ACTIVE","EXPIRED","INACTIVE"],{label:"Status",required:false})
    .string("notes",{label:"Notes",required:false,max:400})
    .result();
  if(!venuesRepo.findById(data.venueId)) throw notFound("That venue no longer exists.");
  if(data.contractEnd < data.contractStart) throw require("../middleware/errors").badRequest("Contract end must be on or after contract start.",{contractEnd:"Contract end must be on or after contract start."});
  res.status(201).json({service:servicesRepo.create(data)});
}));

router.put("/:id", authenticate, authorize("ADMIN"), asyncHandler((req,res)=>{
  const current=servicesRepo.findById(req.params.id); if(!current) throw notFound("That service contract no longer exists.");
  const checker=check(req.body);
  if(req.body.name!==undefined) checker.string("name",{label:"Service name",min:2,max:100});
  if(req.body.category!==undefined) checker.oneOf("category",servicesRepo.CATEGORIES,{label:"Category"});
  if(req.body.providerName!==undefined) checker.string("providerName",{label:"Provider name",min:2,max:100});
  ["role","phone","email","contractRef","billingUnit","scope","notes"].forEach(k=>{if(req.body[k]!==undefined) checker.string(k,{label:k,max:k==='scope'?500:160,required:false});});
  if(req.body.contractStart!==undefined) checker.date("contractStart",{label:"Contract start"});
  if(req.body.contractEnd!==undefined) checker.date("contractEnd",{label:"Contract end"});
  if(req.body.rate!==undefined) checker.integer("rate",{label:"Rate",required:false,min:0,max:10000000});
  if(req.body.status!==undefined) checker.oneOf("status",["ACTIVE","EXPIRED","INACTIVE"],{label:"Status"});
  const data=checker.result();
  const start=data.contractStart||current.contractStart, end=data.contractEnd||current.contractEnd;
  if(start && end && end<start) throw require("../middleware/errors").badRequest("Contract end must be on or after contract start.",{contractEnd:"Contract end must be on or after contract start."});
  res.json({service:servicesRepo.update(req.params.id,data)});
}));

router.delete("/:id", authenticate, authorize("ADMIN"), asyncHandler((req,res)=>{
  const current=servicesRepo.findById(req.params.id); if(!current) throw notFound("That service contract no longer exists.");
  // Keep historical booking references intact: mark it inactive instead of deleting if used.
  try { servicesRepo.remove(req.params.id); res.json({message:"Service contract removed."}); }
  catch(e){ servicesRepo.update(req.params.id,{status:"INACTIVE"}); res.json({message:"Service contract was used before, so it was marked inactive."}); }
}));

module.exports=router;
