const env = require("../config/env");
const venuesRepo = require("../repositories/venues.repo");
const servicesRepo = require("../repositories/services.repo");
const blocksRepo = require("../repositories/blocks.repo");
const bookingsRepo = require("../repositories/bookings.repo");

const normalize = (value) => String(value || "").trim().toLowerCase();
const tokens = (value) => normalize(value).split(/[^a-z0-9]+/).filter(Boolean);

function minutes(time = "00:00") {
  const [h, m] = String(time).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return minutes(aStart) < minutes(bEnd) && minutes(bStart) < minutes(aEnd);
}

function venueOpen(venue, startTime, endTime) {
  return minutes(startTime) >= minutes(venue.openTime) &&
    minutes(endTime) <= minutes(venue.closeTime) &&
    minutes(startTime) < minutes(endTime);
}

async function getCandidates(requirements) {
  const date = requirements.date;
  const venues = await venuesRepo.list({ status: "ACTIVE" });
  const requiredAmenities = Array.isArray(requirements.amenities) ? requirements.amenities : [];
  const requiredServices = Array.isArray(requirements.requiredServices) ? requirements.requiredServices : [];

  return Promise.all(venues.map(async (venue) => {
    const slots = await bookingsRepo.slotsForDate(venue.id, date);
    const conflicts = slots.filter((slot) =>
      ["PENDING", "APPROVED"].includes(slot.status) &&
      overlaps(requirements.startTime, requirements.endTime, slot.startTime, slot.endTime)
    );
    const blockedSlots = await blocksRepo.overlaps({ venueId: venue.id, date, startTime: requirements.startTime, endTime: requirements.endTime });
    const activeServices = await servicesRepo.list({ venueId: venue.id, status: "ACTIVE" });
    const services = activeServices.filter((service) =>
      (!service.contractStart || date >= service.contractStart) &&
      (!service.contractEnd || date <= service.contractEnd)
    );

    const amenityMatches = requiredAmenities.filter((needed) =>
      venue.amenities.some((available) => normalize(available).includes(normalize(needed)) ||
        normalize(needed).includes(normalize(available)))
    );
    const serviceMatches = requiredServices.filter((needed) =>
      services.some((service) =>
        normalize(service.category) === normalize(needed) ||
        normalize(service.name).includes(normalize(needed)) ||
        normalize(service.role).includes(normalize(needed))
      )
    );

    const matchedServiceIds = services
      .filter((service) => serviceMatches.some((needed) =>
        normalize(service.category) === normalize(needed) ||
        normalize(service.name).includes(normalize(needed)) ||
        normalize(service.role).includes(normalize(needed))
      ))
      .map((service) => service.id);
    const serviceConflicts = matchedServiceIds.length
      ? await bookingsRepo.serviceConflicts({
          serviceIds: matchedServiceIds,
          date,
          startTime: requirements.startTime,
          endTime: requirements.endTime,
        })
      : [];

    return {
      id: venue.id,
      name: venue.name,
      type: venue.type,
      location: venue.location,
      capacity: venue.capacity,
      amenities: venue.amenities,
      description: venue.description,
      openTime: venue.openTime,
      closeTime: venue.closeTime,
      availableForRequestedSlot: venueOpen(venue, requirements.startTime, requirements.endTime) && conflicts.length === 0 && blockedSlots.length === 0 && serviceConflicts.length === 0,
      venueHoursFit: venueOpen(venue, requirements.startTime, requirements.endTime),
      conflictingBookings: conflicts.map((c) => ({
        title: c.title, startTime: c.startTime, endTime: c.endTime, status: c.status
      })),
      blockedSlots: blockedSlots.map((b) => ({ startTime: b.startTime, endTime: b.endTime, reason: b.reason })),
      serviceConflicts: serviceConflicts.map((c) => ({
        serviceName: c.service_name,
        title: c.title,
        startTime: c.start_time,
        endTime: c.end_time,
        status: c.status,
      })),
      supportServices: services.map((s) => ({
        id: s.id, name: s.name, category: s.category, providerName: s.providerName,
        role: s.role, rate: s.rate, billingUnit: s.billingUnit,
        contractStart: s.contractStart, contractEnd: s.contractEnd
      })),
      amenityMatches,
      missingAmenities: requiredAmenities.filter((needed) => !amenityMatches.includes(needed)),
      serviceMatches,
      missingServices: requiredServices.filter((needed) => !serviceMatches.includes(needed)),
    };
  }));
}

function scoreCandidate(candidate, requirements) {
  const attendees = Number(requirements.expectedAttendees || 0);
  const capacityFit = attendees > 0
    ? candidate.capacity >= attendees
      ? Math.max(0, 1 - (candidate.capacity - attendees) / Math.max(candidate.capacity, 1))
      : Math.max(0, candidate.capacity / attendees) * 0.35
    : 0.6;

  const amenityFit = requirements.amenities?.length
    ? candidate.amenityMatches.length / requirements.amenities.length
    : 0.7;
  const serviceFit = requirements.requiredServices?.length
    ? candidate.serviceMatches.length / requirements.requiredServices.length
    : 0.7;
  const availability = candidate.availableForRequestedSlot ? 1 : 0;
  const hours = candidate.venueHoursFit ? 1 : 0;

  const eventWords = tokens(`${requirements.category} ${requirements.title} ${requirements.purpose}`);
  const venueWords = tokens(`${candidate.type} ${candidate.name} ${candidate.description}`);
  const eventTypeFit = eventWords.length
    ? Math.min(1, eventWords.filter((word) => venueWords.includes(word)).length / Math.max(2, Math.min(eventWords.length, 5)))
    : 0.6;

  const requestedLocation = normalize(requirements.location);
  const locationWords = tokens(requestedLocation);
  const locationFit = locationWords.length
    ? Math.min(1, locationWords.filter((word) => tokens(candidate.location).includes(word)).length / locationWords.length)
    : 0.6;

  const score = Math.round(100 * (
    capacityFit * 0.25 +
    amenityFit * 0.18 +
    serviceFit * 0.14 +
    availability * 0.25 +
    hours * 0.08 +
    eventTypeFit * 0.05 +
    locationFit * 0.05
  ));

  const reasons = [];
  if (candidate.availableForRequestedSlot) reasons.push("Available for the requested date and time");
  else if (candidate.serviceConflicts?.length) reasons.push(`Support conflict: ${candidate.serviceConflicts[0].serviceName} is assigned elsewhere`);
  else if (candidate.blockedSlots?.length) reasons.push(`Venue blocked: ${candidate.blockedSlots[0].reason}`);
  else if (candidate.conflictingBookings.length) reasons.push("Has a booking conflict in the requested slot");
  if (attendees && candidate.capacity >= attendees) reasons.push(`Capacity fits ${attendees} attendees`);
  if (candidate.amenityMatches.length) reasons.push(`${candidate.amenityMatches.length} requested facilities available`);
  if (candidate.serviceMatches.length) reasons.push(`${candidate.serviceMatches.length} requested support services available`);
  if (requestedLocation && locationFit > 0) reasons.push("Location preference matches");
  if (eventTypeFit > 0.35) reasons.push("Venue type fits the event context");
  if (candidate.missingAmenities.length) reasons.push(`Missing: ${candidate.missingAmenities.join(", ")}`);
  if (candidate.missingServices.length) reasons.push(`Support gap: ${candidate.missingServices.join(", ")}`);

  return { ...candidate, score, reasons };
}

async function fallbackRecommend(requirements) {
  const ranked = (await getCandidates(requirements))
    .map((candidate) => scoreCandidate(candidate, requirements))
    .sort((a, b) => b.score - a.score);

  return {
    mode: "rule-based",
    model: null,
    explanation: "AI service is not configured or was unavailable, so VenueHub used its transparent local recommendation engine.",
    recommendations: ranked.slice(0, 5),
  };
}

async function aiRecommend(requirements, candidates) {
  if (env.AI_PROVIDER !== "openai" || !env.OPENAI_API_KEY) return null;

  const compact = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    location: c.location,
    capacity: c.capacity,
    amenities: c.amenities,
    availableForRequestedSlot: c.availableForRequestedSlot,
    venueHoursFit: c.venueHoursFit,
    conflictingBookings: c.conflictingBookings,
    blockedSlots: c.blockedSlots,
    serviceConflicts: c.serviceConflicts,
    supportServices: c.supportServices,
    basePrice: c.basePrice,
    priceUnit: c.priceUnit,
    amenityMatches: c.amenityMatches,
    missingAmenities: c.missingAmenities,
    serviceMatches: c.serviceMatches,
    missingServices: c.missingServices,
  }));

  const prompt = `You are VenueHub's function hall and event venue recommendation engine.
Recommend up to 5 venues for this event. Use ONLY the supplied venue data.
Prioritize: requested capacity fit, requested facilities, requested support services,
requested event type/purpose, requested location words, pricing/value when useful, and availability for the exact
date/time. Never claim a venue is available when availableForRequestedSlot is false.
A recommendation can be below the requested capacity only as a fallback, and must say so.

EVENT:
${JSON.stringify(requirements, null, 2)}

VENUES:
${JSON.stringify(compact, null, 2)}

Return JSON only in this shape:
{"recommendations":[{"id":"venue-id","score":0,"reason":"short explanation","pros":["..."],"tradeoffs":["..."]}]}
Score is an explainable fit score from 0 to 100.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a precise function hall and event venue planning assistant. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI provider returned ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned no recommendation content.");

  const parsed = JSON.parse(content);
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const recommendations = (parsed.recommendations || [])
    .filter((r) => byId.has(r.id))
    .map((r) => {
      const candidate = byId.get(r.id);
      return {
        ...scoreCandidate(candidate, requirements),
        score: Math.max(0, Math.min(100, Number(r.score) || 0)),
        aiReason: r.reason || "",
        pros: Array.isArray(r.pros) ? r.pros.slice(0, 4) : [],
        tradeoffs: Array.isArray(r.tradeoffs) ? r.tradeoffs.slice(0, 4) : [],
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!recommendations.length) throw new Error("AI provider returned no usable venues.");

  return {
    mode: "ai",
    model: env.OPENAI_MODEL,
    explanation: "VenueHub used AI to interpret the event requirements and rank the available venues, while grounding every recommendation in live venue and booking data.",
    recommendations,
  };
}

async function recommend(requirements) {
  const clean = {
    title: String(requirements.title || "").trim(),
    purpose: String(requirements.purpose || "").trim(),
    category: String(requirements.category || "OTHER").trim(),
    expectedAttendees: Number(requirements.expectedAttendees || 0),
    date: String(requirements.date || "").trim(),
    startTime: String(requirements.startTime || "").trim(),
    endTime: String(requirements.endTime || "").trim(),
    location: String(requirements.location || "").trim(),
    amenities: Array.isArray(requirements.amenities) ? requirements.amenities.filter(Boolean).slice(0, 12) : [],
    requiredServices: Array.isArray(requirements.requiredServices) ? requirements.requiredServices.filter(Boolean).slice(0, 10) : [],
  };

  if (!clean.date || !clean.startTime || !clean.endTime) {
    throw new Error("Date, start time and end time are required for a recommendation.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean.date)) throw new Error("Use a valid event date.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clean.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clean.endTime)) throw new Error("Use valid start and end times.");
  if (clean.startTime >= clean.endTime) throw new Error("End time must be after start time.");
  if (clean.expectedAttendees < 0) throw new Error("Expected attendees cannot be negative.");

  const candidates = await getCandidates(clean);
  try {
    const ai = await aiRecommend(clean, candidates);
    if (ai) return ai;
  } catch (err) {
    console.warn(`[AI] Recommendation failed: ${err.message}`);
  }
  return fallbackRecommend(clean);
}

module.exports = { recommend };
