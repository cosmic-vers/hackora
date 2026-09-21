const { db, transaction } = require("./database");
const usersRepo = require("./repositories/users.repo");
const venuesRepo = require("./repositories/venues.repo");
const bookingsRepo = require("./repositories/bookings.repo");

const DEMO_USERS = [
  {
    name: "System Administrator",
    email: "admin@venuehub.edu",
    password: "Admin@123",
    role: "ADMIN",
    department: "Campus Administration",
    phone: "9999900000",
  },
  {
    name: "Dr. Meera Nair",
    email: "faculty@venuehub.edu",
    password: "Faculty@123",
    role: "FACULTY",
    department: "Computer Science",
    phone: "9999900001",
  },
  {
    name: "Aarav Sharma",
    email: "student@venuehub.edu",
    password: "Student@123",
    role: "STUDENT",
    department: "Computer Science",
    phone: "9999900002",
  },
  {
    name: "Robotics Club",
    email: "club@venuehub.edu",
    password: "Club@123",
    role: "CLUB",
    department: "Student Activities",
    phone: "9999900003",
  },
];

const DEMO_VENUES = [
  {
    name: "Kalam Auditorium",
    type: "Auditorium",
    location: "Main Block, Ground Floor",
    capacity: 600,
    amenities: ["Stage", "Projector", "Sound System", "Air Conditioning", "Green Room"],
    image: "auditorium",
    description:
      "The college's premier venue for convocations, cultural festivals, and large-scale events.",
    openTime: "08:00",
    closeTime: "21:00",
  },
  {
    name: "Innovation Seminar Hall",
    type: "Seminar Hall",
    location: "Tech Block, 2nd Floor",
    capacity: 150,
    amenities: ["Projector", "Whiteboard", "Air Conditioning", "Video Conferencing"],
    image: "seminar",
    description: "Built for guest lectures, workshops, and departmental seminars.",
    openTime: "08:00",
    closeTime: "20:00",
  },
  {
    name: "Function Hall A",
    type: "Function Hall",
    location: "Student Center, 1st Floor",
    capacity: 300,
    amenities: ["Stage", "Sound System", "Decoration Points", "Catering Access"],
    image: "function",
    description: "Multipurpose hall for club events, celebrations, and inter-college fests.",
    openTime: "09:00",
    closeTime: "22:00",
  },
  {
    name: "Classroom C-204",
    type: "Classroom",
    location: "Academic Block C, 2nd Floor",
    capacity: 60,
    amenities: ["Projector", "Whiteboard"],
    image: "classroom",
    description: "Smart classroom for extra classes, club meetings, and small workshops.",
    openTime: "08:00",
    closeTime: "18:00",
  },
  {
    name: "Open Air Theatre",
    type: "Outdoor Venue",
    location: "Central Lawn",
    capacity: 1000,
    amenities: ["Stage", "Sound System", "Lighting Rig"],
    image: "outdoor",
    description: "Open-air venue for cultural nights, fests, and community gatherings.",
    openTime: "16:00",
    closeTime: "22:00",
  },
  {
    name: "Board Room",
    type: "Meeting Room",
    location: "Admin Block, 3rd Floor",
    capacity: 25,
    amenities: ["Video Conferencing", "Whiteboard", "Air Conditioning"],
    image: "boardroom",
    description: "Formal room for committees, department heads, and official meetings.",
    openTime: "09:00",
    closeTime: "18:00",
  },
];

function enrichVenues() {
  const prices = [25000, 9000, 7000, 4000, 30000, 12000];
  venuesRepo.list().forEach((v,i)=>{
    const photos=[
      `https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80&sig=${i}`,
      `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80&sig=${i+20}`
    ];
    venuesRepo.update(v.id,{basePrice:prices[i]||8000,priceUnit:'event',photos});
  });
}

function dateIn(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function seed({ quiet = false } = {}) {
  const log = (...args) => {
    if (!quiet) console.log(...args);
  };

  const seededUsers = usersRepo.count() === 0;
  const missingDemoUsers = DEMO_USERS.filter((u) => !usersRepo.findByEmail(u.email));
  if (seededUsers || missingDemoUsers.length) {
    transaction(() => missingDemoUsers.forEach((u) => usersRepo.create(u)))();
    log("Ensured demo accounts:");
    DEMO_USERS.forEach((u) => log(`  ${u.role.padEnd(9)} ${u.email} / ${u.password}`));
  }

  const seededVenues = venuesRepo.count() === 0;
  if (seededVenues) {
    transaction(() => DEMO_VENUES.forEach((v) => venuesRepo.create(v)))();
    log(`Seeded ${DEMO_VENUES.length} campus venues.`);
    enrichVenues();
  }

  if (venuesRepo.list().some(v => !v.basePrice || !v.photos?.length)) enrichVenues();

  const serviceRepo = require('./repositories/services.repo');
  if (db.prepare('SELECT COUNT(*) AS n FROM venue_services').get().n === 0) {
    const venues = venuesRepo.list();
    const templates = [
      ['Premium Catering','CATERING','Campus Catering Co.',2500],
      ['Event Decoration','DECORATION','Celebration Studio',5000],
      ['Photography','OTHER','FrameWorks Media',4500],
      ['Sound & AV System','TECHNICAL','Campus AV Team',1800],
      ['Seating Arrangement','OTHER','Event Setup Crew',1200],
      ['Professional Cleaning','CLEANING','Campus Housekeeping',900],
      ['Security Staff','SECURITY','Campus Security Services',1500]
    ];
    transaction(()=>{
      venues.forEach(v=>templates.forEach(t=>serviceRepo.create({venueId:v.id,name:t[0],category:t[1],providerName:t[2],rate:t[3],billingUnit:'event',scope:'Event-day support'})));
    })();
    log('Seeded venue support services.');
  }

  // A little sample activity so the dashboard and analytics are not empty on
  // a fresh install. Only ever runs when both users and venues were just made.
  const noBookings = db.prepare("SELECT COUNT(*) AS n FROM bookings").get().n === 0;
  if (seededUsers && seededVenues && noBookings) {
    const venues = venuesRepo.list();
    const faculty = usersRepo.findByEmail("faculty@venuehub.edu");
    const club = usersRepo.findByEmail("club@venuehub.edu");
    const student = usersRepo.findByEmail("student@venuehub.edu");
    const admin = usersRepo.findByEmail("admin@venuehub.edu");
    const byName = (name) => venues.find((v) => v.name === name);

    const samples = [
      {
        user: faculty,
        venue: byName("Innovation Seminar Hall"),
        title: "Industry guest lecture: applied ML",
        purpose: "Guest session for final-year students with an industry speaker.",
        category: "ACADEMIC",
        date: dateIn(3),
        startTime: "10:00",
        endTime: "12:00",
        expectedAttendees: 120,
        approve: true,
      },
      {
        user: club,
        venue: byName("Open Air Theatre"),
        title: "Robotics Club showcase night",
        purpose: "Annual project demo and prize distribution.",
        category: "TECHNICAL",
        date: dateIn(9),
        startTime: "17:30",
        endTime: "20:30",
        expectedAttendees: 400,
        approve: true,
      },
      {
        user: student,
        venue: byName("Classroom C-204"),
        title: "Placement prep study group",
        purpose: "Weekly aptitude practice session.",
        category: "PLACEMENT",
        date: dateIn(2),
        startTime: "15:00",
        endTime: "17:00",
        expectedAttendees: 40,
        approve: false,
      },
    ];

    samples.forEach((s) => {
      if (!s.user || !s.venue) return;
      const { booking } = bookingsRepo.create({
        venueId: s.venue.id,
        userId: s.user.id,
        title: s.title,
        purpose: s.purpose,
        category: s.category,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        expectedAttendees: s.expectedAttendees,
        requesterName: s.user.name,
        venueName: s.venue.name,
      });
      if (s.approve && admin) {
        bookingsRepo.decide({
          id: booking.id,
          status: "APPROVED",
          adminRemarks: "Approved — please collect the venue key an hour early.",
          adminId: admin.id,
        });
      }
    });

    log(`Seeded ${samples.length} sample bookings.`);
  }
}

module.exports = seed;

if (require.main === module) {
  require("./database/migrate-json")();
  seed();
  console.log("Seed complete.");
}
