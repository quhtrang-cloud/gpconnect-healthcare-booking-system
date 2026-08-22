const chatbotResponses = [
  // Greetings (20)
  { question: "hello", answer: "Hi! Welcome to the GP Appointment System chatbot. How can I assist you?" },
  { question: "hi", answer: "Hello! I'm here to help with your GP appointments. What's your question?" },
  { question: "hey", answer: "Hey there! Ready to assist with bookings or anything else. What's up?" },
  { question: "greetings", answer: "Greetings! I'm your GP Appointment System assistant. How can I help?" },
  { question: "good morning", answer: "Good morning! Need help with appointments today?" },
  { question: "good afternoon", answer: "Good afternoon! How can I assist with your GP needs?" },
  { question: "good evening", answer: "Good evening! What's on your mind? Appointments, feedback, or something else?" },
  { question: "how are you", answer: "I'm doing great, thanks! How about you? Need help with the system?" },
  { question: "yo", answer: "Yo! What's up? I'm here to help with GP appointments." },
  { question: "hola", answer: "Hola! How can I assist you with the GP Appointment System?" },
  { question: "salut", answer: "Salut! Ready to help with your appointments. What's your question?" },
  { question: "hi there", answer: "Hi there! I'm your chatbot for GP appointments. What's on your mind?" },
  { question: "hello bot", answer: "Hello! I'm the GP Appointment System bot. How can I help you today?" },
  { question: "hey bot", answer: "Hey! I'm here to answer your GP system questions. What's up?" },
  { question: "good day", answer: "Good day! How can I make your GP appointment experience smoother?" },
  { question: "morning", answer: "Morning! Ready to assist with your GP appointments. What's your query?" },
  { question: "afternoon", answer: "Afternoon! Need help with booking or managing appointments?" },
  { question: "evening", answer: "Evening! I'm here for all your GP system questions. What's up?" },
  { question: "chatbot", answer: "That's me! How can I help you with the GP Appointment System?" },
  { question: "bot", answer: "Yo, I'm the GP chatbot! What's your question about appointments or the system?" },

  // Account Management (30)
  { question: "register", answer: "Go to the Register page, enter your name, email, and password, then click 'Submit'." },
  { question: "sign up", answer: "Visit the Register page, fill in your name, email, and password, and submit." },
  { question: "signup", answer: "Head to the Register page, provide your details, and click 'Submit' to sign up." },
  { question: "create account", answer: "On the Register page, enter your name, email, and password, then submit." },
  { question: "login", answer: "Go to the Login page, enter your email and password, then click 'Submit'." },
  { question: "sign in", answer: "Visit the Login page, input your email and password, and submit." },
  { question: "log in", answer: "Head to the Login page, type your email and password, and click 'Submit'." },
  { question: "forgot password", answer: "Password recovery isn't available yet. Email support@gpappointmentsystem.com for a reset." },
  { question: "reset password", answer: "Password reset isn't supported. Contact support@gpappointmentsystem.com for help." },
  { question: "password reset", answer: "Please email support@gpappointmentsystem.com to reset your password." },
  { question: "change password", answer: "Password changes aren't available. Contact support@gpappointmentsystem.com." },
  { question: "update password", answer: "Password updates aren't supported yet. Email support@gpappointmentsystem.com." },
  { question: "new password", answer: "To change your password, contact support@gpappointmentsystem.com." },
  { question: "update email", answer: "Email updates aren't available. Email support@gpappointmentsystem.com to change your email." },
  { question: "change email", answer: "To update your email, contact support@gpappointmentsystem.com." },
  { question: "delete account", answer: "Account deletion isn't supported. Contact support@gpappointmentsystem.com." },
  { question: "remove account", answer: "To delete your account, email support@gpappointmentsystem.com." },
  { question: "profile", answer: "Go to the Profile page via the Account dropdown to view or edit your details." },
  { question: "edit profile", answer: "Visit the Profile page from the Account dropdown to update your name or email." },
  { question: "update profile", answer: "Head to the Profile page under Account to edit your details." },
  { question: "logout", answer: "Click the Account dropdown and select 'Logout' to sign out." },
  { question: "sign out", answer: "To log out, go to the Account dropdown and click 'Logout'." },
  { question: "log out", answer: "Use the Account dropdown and select 'Logout' to exit." },
  { question: "role", answer: "Your role defines access: Users book appointments, GPs view schedules, Admins manage the system." },
  { question: "user role", answer: "Users can book, swap, and manage appointments and give feedback." },
  { question: "gp role", answer: "GPs view their schedules and feedback on the GP Dashboard." },
  { question: "admin role", answer: "Admins manage GPs, appointments, and swap requests via the Admin Dashboard." },
  { question: "account details", answer: "Check your name and email on the Profile page under the Account dropdown." },
  { question: "who am i", answer: "You're logged in as a user, GP, or admin. Check your role on the Profile page." },
  { question: "account", answer: "Access your account details or logout via the Account dropdown in the navbar." },

  // Appointment Booking (30)
  { question: "book", answer: "Go to the Appointments page, select city, date, and GP, then click 'Book'." },
  { question: "booking", answer: "Visit the Appointments page, choose a city, date, and GP, and click 'Book'." },
  { question: "book appointment", answer: "On the Appointments page, pick a city, date, and GP, then click 'Book'." },
  { question: "how to book", answer: "Go to the Appointments page, select your city, date, and GP, then click 'Book'." },
  { question: "appointment", answer: "To book an appointment, visit the Appointments page and select a slot." },
  { question: "new appointment", answer: "Head to the Appointments page, choose a city, date, and GP, then book." },
  { question: "available appointments", answer: "Check available slots on the Appointments page, filtered by city or GP." },
  { question: "appointment availability", answer: "View available appointments on the Appointments page by city or GP." },
  { question: "urgent", answer: "For urgent care, enter 'urgent' in symptoms on the Appointments page." },
  { question: "urgent appointment", answer: "On the Appointments page, include 'urgent' in symptoms for priority slots." },
  { question: "emergency", answer: "For emergencies, add 'urgent' in symptoms on the Appointments page." },
  { question: "book urgent", answer: "Go to Appointments, enter 'urgent' in symptoms, and book a priority slot." },
  { question: "find appointment", answer: "Search for appointments on the Appointments page by city, date, or GP." },
  { question: "appointment times", answer: "Appointments are 30 minutes, typically from 8 AM to 5 PM." },
  { question: "morning appointment", answer: "Filter for morning slots (8 AM–12 PM) on the Appointments page." },
  { question: "afternoon appointment", answer: "Select afternoon slots (12 PM–5 PM) on the Appointments page." },
  { question: "evening appointment", answer: "Evening slots may be limited. Check the Appointments page for availability." },
  { question: "weekend appointment", answer: "Weekend slots depend on GPs. Filter by date on the Appointments page." },
  { question: "next appointment", answer: "Find the next available slot on the Appointments page by date." },
  { question: "soonest appointment", answer: "Search for the earliest slot on the Appointments page." },
  { question: "city", answer: "Choose a city like London or Manchester on the Appointments page to book." },
  { question: "london appointments", answer: "Filter by 'London' on the Appointments page to see available slots." },
  { question: "manchester appointments", answer: "Select 'Manchester' on the Appointments page for available slots." },
  { question: "birmingham appointments", answer: "Choose 'Birmingham' on the Appointments page to book." },
  { question: "leeds appointments", answer: "Filter by 'Leeds' on the Appointments page for available slots." },
  { question: "gp list", answer: "View available GPs on the Appointments page dropdown." },
  { question: "choose gp", answer: "Select a GP from the dropdown on the Appointments page to book." },
  { question: "specific gp", answer: "Pick your preferred GP on the Appointments page before booking." },
  { question: "book with gp", answer: "Go to the Appointments page, select your GP, and book a slot." },
  { question: "appointment date", answer: "Choose a date on the Appointments page to see available slots." },

  // Appointment Management (30)
  { question: "cancel", answer: "Go to the Appointments page, find your appointment, and click 'Cancel'." },
  { question: "cancel appointment", answer: "On the Appointments page, locate your booked appointment and select 'Cancel'." },
  { question: "how to cancel", answer: "Visit the Appointments page, go to 'My Booked Appointments', and click 'Cancel'." },
  { question: "swap", answer: "On the Appointments page, select your appointment and a target slot, then submit a swap request." },
  { question: "swap appointment", answer: "Go to the Appointments page, choose your appointment and a target, then request a swap." },
  { question: "how to swap", answer: "On the Appointments page, pick your appointment and a target slot in 'Request an Appointment Swap'." },
  { question: "reschedule", answer: "Cancel your current appointment and book a new one, or request a swap on the Appointments page." },
  { question: "reschedule appointment", answer: "To reschedule, cancel your appointment or request a swap on the Appointments page." },
  { question: "change appointment", answer: "Cancel and rebook or request a swap on the Appointments page." },
  { question: "appointment details", answer: "View your appointment details under 'My Booked Appointments' on the Appointments page." },
  { question: "check appointment", answer: "See your booked appointments on the Appointments page under 'My Booked Appointments'." },
  { question: "my appointments", answer: "Check your booked appointments on the Appointments page." },
  { question: "upcoming appointments", answer: "View upcoming appointments in 'My Booked Appointments' on the Appointments page." },
  { question: "past appointments", answer: "Past appointments may be visible on the Appointments page, depending on system settings." },
  { question: "appointment status", answer: "Check the status of your appointments on the Appointments page." },
  { question: "swap status", answer: "View swap request status on the Appointments page or Admin Dashboard (for admins)." },
  { question: "pending swap", answer: "Pending swaps are shown on the Appointments page or Admin Dashboard." },
  { question: "approved swap", answer: "Approved swaps update your appointment on the Appointments page." },
  { question: "rejected swap", answer: "Rejected swaps are notified via email and shown on the Appointments page." },
  { question: "appointment time", answer: "See your appointment time under 'My Booked Appointments' on the Appointments page." },
  { question: "appointment location", answer: "Check the practice city for your appointment on the Appointments page." },
  { question: "appointment gp", answer: "View the GP for your appointment on the Appointments page." },
  { question: "cancel reason", answer: "No reason is required to cancel. Just click 'Cancel' on the Appointments page." },
  { question: "swap reason", answer: "Provide a reason when requesting a swap on the Appointments page for admin review." },
  { question: "multiple appointments", answer: "You can book multiple appointments, but check for conflicts on the Appointments page." },
  { question: "appointment limit", answer: "No strict limit on appointments, but availability depends on GP schedules." },
  { question: "confirm appointment", answer: "Appointments are confirmed upon booking. Check 'My Booked Appointments'." },
  { question: "appointment reminder", answer: "Enable email or SMS reminders in Preferences for appointment notifications." },
  { question: "missed appointment", answer: "Missed appointments remain in your history. Contact the practice for follow-up." },
  { question: "appointment history", answer: "View your booking history on the Appointments page, if available." },

  // Feedback (20)
  { question: "feedback", answer: "Go to the Feedback page, select an appointment, rate it, and submit comments." },
  { question: "submit feedback", answer: "On the Feedback page, choose an appointment, rate 1-5, add comments, and submit." },
  { question: "leave feedback", answer: "Visit the Feedback page, select your appointment, rate it, and submit." },
  { question: "how to feedback", answer: "Go to the Feedback page, pick an appointment, rate it, and add comments." },
  { question: "rate appointment", answer: "On the Feedback page, select an appointment and give it a 1-5 star rating." },
  { question: "review gp", answer: "Rate your GP on the Feedback page by selecting an appointment and submitting." },
  { question: "view feedback", answer: "Users see their feedback on the Feedback page; admins/GPs see all feedback." },
  { question: "check feedback", answer: "Go to the Feedback page to view your submitted feedback." },
  { question: "edit feedback", answer: "Feedback editing isn't available. Contact support@gpappointmentsystem.com." },
  { question: "change feedback", answer: "You can't edit feedback. Email support@gpappointmentsystem.com for issues." },
  { question: "delete feedback", answer: "Feedback deletion isn't supported. Contact support@gpappointmentsystem.com." },
  { question: "remove feedback", answer: "To remove feedback, email support@gpappointmentsystem.com." },
  { question: "feedback rating", answer: "Rate appointments 1-5 stars on the Feedback page." },
  { question: "feedback comments", answer: "Add comments to your feedback on the Feedback page when rating." },
  { question: "gp feedback", answer: "Provide feedback on your GP via the Feedback page after an appointment." },
  { question: "bad feedback", answer: "Submit low ratings or comments on the Feedback page to report issues." },
  { question: "good feedback", answer: "Give high ratings and positive comments on the Feedback page." },
  { question: "feedback history", answer: "View your past feedback on the Feedback page." },
  { question: "anonymous feedback", answer: "Feedback is linked to your account, not anonymous. Contact support for concerns." },
  { question: "feedback issues", answer: "For feedback issues, email support@gpappointmentsystem.com." },

  // Preferences (15)
  { question: "preferences", answer: "Go to the Preferences page to set your preferred GP and notifications." },
  { question: "update preferences", answer: "On the Preferences page, select your preferred GP and notifications, then save." },
  { question: "change preferences", answer: "Visit the Preferences page to update your GP or notification settings." },
  { question: "preferred gp", answer: "Set your preferred GP on the Preferences page from the dropdown." },
  { question: "set gp", answer: "Choose your preferred GP on the Preferences page and save." },
  { question: "notification", answer: "Update notification settings (email/SMS) on the Preferences page." },
  { question: "email notification", answer: "Enable email notifications on the Preferences page." },
  { question: "sms notification", answer: "Turn on SMS notifications in the Preferences page settings." },
  { question: "disable notification", answer: "Uncheck email and SMS options on the Preferences page to disable." },
  { question: "turn off notification", answer: "Go to Preferences and uncheck notification options to disable." },
  { question: "notification settings", answer: "Manage email and SMS settings on the Preferences page." },
  { question: "save preferences", answer: "Click 'Save' on the Preferences page after updating your settings." },
  { question: "gp preference", answer: "Select a preferred GP on the Preferences page to prioritize bookings." },
  { question: "reset preferences", answer: "Update or clear preferences on the Preferences page." },
  { question: "default preferences", answer: "Set default GP or notification settings on the Preferences page." },

  // System Features (20)
  { question: "intelligent scheduling", answer: "Intelligent scheduling recommends appointments based on symptoms, time, and GP. Enable it on the Appointments page." },
  { question: "smart scheduling", answer: "Enable intelligent scheduling on the Appointments page for personalized recommendations." },
  { question: "google calendar", answer: "Sync appointments to Google Calendar via the Appointments page after booking." },
  { question: "calendar sync", answer: "Click the Google Calendar sync button on the Appointments page." },
  { question: "check conflicts", answer: "Use 'Check Conflict' on the Appointments page to avoid calendar overlaps." },
  { question: "conflict", answer: "Check for appointment conflicts with Google Calendar on the Appointments page." },
  { question: "appointment conflict", answer: "Click 'Check Conflict' on the Appointments page to see calendar clashes." },
  { question: "gp connect", answer: "GP Connect is a system to book, manage, and swap GP appointments with feedback features." },
  { question: "system features", answer: "GP Connect offers booking, swapping, feedback, intelligent scheduling, and calendar sync." },
  { question: "calendar integration", answer: "Integrate appointments with Google Calendar via the Appointments page." },
  { question: "recommend appointment", answer: "Enable intelligent scheduling for appointment recommendations based on your preferences." },
  { question: "appointment suggestion", answer: "Use intelligent scheduling on the Appointments page for suggested slots." },
  { question: "system help", answer: "Ask me about booking, feedback, or other features, or email support@gpappointmentsystem.com." },
  { question: "dashboard", answer: "Access your dashboard: Users (Appointments), GPs (GP Dashboard), Admins (Admin Dashboard)." },
  { question: "user dashboard", answer: "Users manage appointments and feedback on the Appointments page." },
  { question: "gp dashboard", answer: "GPs view schedules and feedback on the GP Dashboard." },
  { question: "admin dashboard", answer: "Admins manage GPs, appointments, and swaps on the Admin Dashboard." },
  { question: "mobile app", answer: "No mobile app yet. Use the website on your browser." },
  { question: "browser support", answer: "GP Connect works on Chrome, Firefox, Safari, and Edge." },
  { question: "system status", answer: "The system is online. For issues, contact support@gpappointmentsystem.com." },

  // Support and Contact (15)
  { question: "support", answer: "Email support@gpappointmentsystem.com or check the footer for contact info." },
  { question: "contact", answer: "Reach support at support@gpappointmentsystem.com." },
  { question: "help", answer: "For help, email support@gpappointmentsystem.com or ask me your question." },
  { question: "support email", answer: "Contact support at support@gpappointmentsystem.com." },
  { question: "report issue", answer: "Email support@gpappointmentsystem.com with issue details." },
  { question: "bug", answer: "Report bugs to support@gpappointmentsystem.com with a description." },
  { question: "error", answer: "For errors, contact support@gpappointmentsystem.com with details." },
  { question: "technical issue", answer: "Email technical issues to support@gpappointmentsystem.com." },
  { question: "contact admin", answer: "Admins can be reached via support@gpappointmentsystem.com." },
  { question: "customer service", answer: "Contact support@gpappointmentsystem.com for customer service." },
  { question: "complaint", answer: "Send complaints to support@gpappointmentsystem.com." },
  { question: "feedback support", answer: "For feedback issues, email support@gpappointmentsystem.com." },
  { question: "appointment issue", answer: "Report appointment issues to support@gpappointmentsystem.com." },
  { question: "system down", answer: "If the system is down, email support@gpappointmentsystem.com." },
  { question: "helpdesk", answer: "Reach our helpdesk at support@gpappointmentsystem.com." },

  // Admin-Specific (25)
  { question: "add gp", answer: "Admins can add a GP on the Admin Dashboard in 'Add New GP'." },
  { question: "new gp", answer: "On the Admin Dashboard, enter a GP name and practice to add a new GP." },
  { question: "how to add gp", answer: "Go to the Admin Dashboard, fill in the GP name and practice, then submit." },
  { question: "add appointment", answer: "Admins can add appointments on the Admin Dashboard in 'Add New Appointment'." },
  { question: "new appointment", answer: "On the Admin Dashboard, select a GP, start time, and end time to add an appointment." },
  { question: "how to add appointment", answer: "Go to the Admin Dashboard, choose a GP and times, then submit." },
  { question: "approve swap", answer: "Admins can approve swap requests in the 'Swap Requests' section of the Admin Dashboard." },
  { question: "reject swap", answer: "Admins can reject swaps in the 'Swap Requests' section of the Admin Dashboard." },
  { question: "swap request", answer: "Admins manage swap requests on the Admin Dashboard under 'Swap Requests'." },
  { question: "manage gps", answer: "Admins can view and add GPs on the Admin Dashboard." },
  { question: "gp list admin", answer: "See all GPs in the 'Current GPs' section of the Admin Dashboard." },
  { question: "delete gp", answer: "GP deletion isn't supported. Contact support@gpappointmentsystem.com." },
  { question: "edit gp", answer: "GP editing isn't available. Add a new GP or contact support." },
  { question: "appointment admin", answer: "Admins manage appointments on the Admin Dashboard under 'Available Appointments'." },
  { question: "cancel admin appointment", answer: "Admins can't cancel user appointments. Users must cancel their own." },
  { question: "swap approval", answer: "Approve or reject swaps in the 'Swap Requests' section of the Admin Dashboard." },
  { question: "pending swaps", answer: "View pending swap requests on the Admin Dashboard." },
  { question: "approved swaps", answer: "Approved swaps are updated on the Admin Dashboard and user appointments." },
  { question: "rejected swaps", answer: "Rejected swaps are shown on the Admin Dashboard and notified to users." },
  { question: "admin feedback", answer: "Admins can view all feedback on the Admin Dashboard under 'Feedback'." },
  { question: "admin tasks", answer: "Admins manage GPs, appointments, swaps, and feedback on the Admin Dashboard." },
  { question: "admin settings", answer: "Access admin settings via the Admin dropdown for system configurations." },
  { question: "practice", answer: "Admins can view practices when adding GPs on the Admin Dashboard." },
  { question: "add practice", answer: "Adding practices isn't supported yet. Contact support@gpappointmentsystem.com." },
  { question: "manage practices", answer: "Admins can view practices when managing GPs on the Admin Dashboard." },

  // General Information (30)
  { question: "gp", answer: "GP stands for General Practitioner, your primary care doctor." },
  { question: "general practitioner", answer: "A General Practitioner (GP) is a doctor for non-emergency health issues." },
  { question: "cities", answer: "Available cities include London, Manchester, Birmingham, Leeds, and more. Check the Appointments page." },
  { question: "available cities", answer: "Cities like London, Manchester, Birmingham, and Leeds are available on the Appointments page." },
  { question: "appointment duration", answer: "Appointments are typically 30 minutes, depending on the GP." },
  { question: "cost", answer: "Appointment costs vary by practice. Contact the practice for details." },
  { question: "appointment cost", answer: "Check with the practice for appointment pricing, as it’s not managed here." },
  { question: "free appointment", answer: "Free appointments depend on the practice. Contact them for details." },
  { question: "telehealth", answer: "Telehealth isn’t supported. All appointments are in-person." },
  { question: "virtual appointment", answer: "Virtual appointments aren’t available. Book in-person slots." },
  { question: "in-person appointment", answer: "All appointments are in-person. Book on the Appointments page." },
  { question: "practice", answer: "Practices are medical facilities where GPs work, listed on the Appointments page." },
  { question: "london", answer: "Filter by 'London' on the Appointments page to book in London." },
  { question: "manchester", answer: "Select 'Manchester' on the Appointments page for available slots." },
  { question: "birmingham", answer: "Choose 'Birmingham' on the Appointments page to book." },
  { question: "leeds", answer: "Filter by 'Leeds' on the Appointments page for appointments." },
  { question: "glasgow", answer: "Select 'Glasgow' on the Appointments page for available slots." },
  { question: "doctor", answer: "Doctors (GPs) are listed on the Appointments page for booking." },
  { question: "healthcare", answer: "GP Connect helps you book healthcare appointments with General Practitioners." },
  { question: "system", answer: "GP Connect is a system for booking, managing, and swapping GP appointments." },
  { question: "appointment rules", answer: "Book only available slots, cancel anytime, and swaps need admin approval." },
  { question: "booking rules", answer: "Choose available slots, avoid conflicts, and enable intelligent scheduling for recommendations." },
  { question: "gp availability", answer: "Check GP availability on the Appointments page by selecting a GP." },
  { question: "practice location", answer: "Practice locations are shown on the Appointments page (e.g., London, Manchester)." },
  { question: "appointment types", answer: "Appointments are standard or urgent, booked via the Appointments page." },
  { question: "urgent care", answer: "For urgent care, add 'urgent' in symptoms on the Appointments page." },
  { question: "emergency care", answer: "For emergencies, mark 'urgent' in symptoms or contact your practice directly." },
  { question: "gp hours", answer: "GPs typically work 8 AM to 5 PM, but check availability on the Appointments page." },
  { question: "system language", answer: "The system is in English. Contact support for other language assistance." },
  { question: "accessibility", answer: "The system supports standard browsers. Contact support for accessibility issues." },

  // Edge Cases (10)
  { question: "not working", answer: "If the system isn’t working, email support@gpappointmentsystem.com with details." },
  { question: "error message", answer: "Note the error message and email support@gpappointmentsystem.com." },
  { question: "slow system", answer: "For slow performance, try refreshing or contact support@gpappointmentsystem.com." },
  { question: "login issue", answer: "Check your email/password or email support@gpappointmentsystem.com for login issues." },
  { question: "booking error", answer: "If booking fails, try again or contact support@gpappointmentsystem.com." },
  { question: "swap error", answer: "For swap request issues, email support@gpappointmentsystem.com." },
  { question: "feedback error", answer: "If feedback submission fails, contact support@gpappointmentsystem.com." },
  { question: "page not found", answer: "If a page is missing, check your URL or email support@gpappointmentsystem.com." },
  { question: "crash", answer: "Report system crashes to support@gpappointmentsystem.com with details." },
  { question: "bug report", answer: "Send bug reports to support@gpappointmentsystem.com with a description." }
];

const fallbackResponse = "Oops, I didn't catch that! Could you try something like 'how to book an appointment'? For further help, email support@gpappointmentsystem.com.";

function initChatbot() {
  // Create floating chat bubble
  const bubble = document.createElement('div');
  bubble.id = 'chatbot-bubble';
  bubble.style.position = 'fixed';
  bubble.style.bottom = '20px';
  bubble.style.right = '20px';
  bubble.style.width = '60px';
  bubble.style.height = '60px';
  bubble.style.backgroundColor = '#4a6fa5'; // Matches --primary from admin.ejs
  bubble.style.borderRadius = '50%';
  bubble.style.cursor = 'pointer';
  bubble.style.display = 'flex';
  bubble.style.alignItems = 'center';
  bubble.style.justifyContent = 'center';
  bubble.style.color = 'white';
  bubble.style.fontSize = '30px';
  bubble.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
  bubble.style.zIndex = '1000';
  bubble.innerHTML = '<i class="fas fa-robot"></i>';
  document.body.appendChild(bubble);

  // Create chat window
  const window = document.createElement('div');
  window.id = 'chatbot-window';
  window.style.position = 'fixed';
  window.style.bottom = '90px';
  window.style.right = '20px';
  window.style.width = '350px';
  window.style.height = '450px';
  window.style.backgroundColor = 'white';
  window.style.borderRadius = '16px';
  window.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
  window.style.display = 'none';
  window.style.flexDirection = 'column';
  window.style.overflow = 'hidden';
  window.style.zIndex = '1000';
  window.style.fontFamily = "'Poppins', sans-serif"; // Matches admin.ejs
  document.body.appendChild(window);

  // Chat header
  const header = document.createElement('div');
  header.style.background = 'linear-gradient(90deg, #4a6fa5, #166088)'; // Matches navbar gradient
  header.style.color = 'white';
  header.style.padding = '15px';
  header.style.fontWeight = '600';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.innerHTML = '<span>GP Connect Chatbot</span><i class="fas fa-times" style="cursor: pointer;"></i>';
  window.appendChild(header);

  // Chat messages container
  const messages = document.createElement('div');
  messages.id = 'chatbot-messages';
  messages.style.flex = '1';
  messages.style.padding = '15px';
  messages.style.overflowY = 'auto';
  messages.style.background = '#f8f9fa'; // Matches --light from admin.ejs
  window.appendChild(messages);

  // Input area
  const inputArea = document.createElement('div');
  inputArea.style.display = 'flex';
  inputArea.style.padding = '15px';
  inputArea.style.borderTop = '1px solid #e5e7eb';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type your question...';
  input.style.flex = '1';
  input.style.borderRadius = '8px';
  input.style.border = '1px solid #ced4da';
  input.style.padding = '10px';
  input.style.marginRight = '10px';
  input.style.fontFamily = "'Poppins', sans-serif";
  const sendBtn = document.createElement('button');
  sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
  sendBtn.style.backgroundColor = '#4a6fa5'; // Matches --primary
  sendBtn.style.color = 'white';
  sendBtn.style.border = 'none';
  sendBtn.style.borderRadius = '8px';
  sendBtn.style.padding = '10px 15px';
  sendBtn.style.cursor = 'pointer';
  inputArea.appendChild(input);
  inputArea.appendChild(sendBtn);
  window.appendChild(inputArea);

  // Toggle chat window
  bubble.addEventListener('click', () => {
    window.style.display = window.style.display === 'none' ? 'flex' : 'none';
  });
  header.querySelector('.fa-times').addEventListener('click', () => {
    window.style.display = 'none';
  });

  // Send message on enter or button click
  function sendMessage() {
    const query = input.value.trim().toLowerCase();
    if (!query) return;
    addMessage('user', query);
    const response = getResponse(query);
    addMessage('bot', response);
    input.value = '';
  }
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Add message to chat
  function addMessage(sender, text) {
    const msg = document.createElement('div');
    msg.style.marginBottom = '10px';
    msg.style.padding = '10px';
    msg.style.borderRadius = '8px';
    msg.style.maxWidth = '80%';
    msg.style.wordBreak = 'break-word';
    if (sender === 'user') {
      msg.style.backgroundColor = '#d4edda'; // Matches alert-success
      msg.style.alignSelf = 'flex-end';
    } else {
      msg.style.backgroundColor = '#ffffff';
      msg.style.border = '1px solid #e5e7eb';
    }
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  // Get response from hardcoded list
  function getResponse(query) {
    for (const res of chatbotResponses) {
      if (query.includes(res.question.toLowerCase())) {
        return res.answer;
      }
    }
    return fallbackResponse;
  }

  // Initial greeting
  addMessage('bot', 'Hello! How can I help you with GP appointments?');
}

// Initialize chatbot on page load
document.addEventListener('DOMContentLoaded', initChatbot);