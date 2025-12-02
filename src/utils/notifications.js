import emailjs from '@emailjs/browser';

/**
 * NOTIFICATION UTILITY
 * Sends real emails via EmailJS.
 */

// REPLACE THESE WITH YOUR ACTUAL KEYS FROM EMAILJS DASHBOARD
const SERVICE_ID = 'YOUR_SERVICE_ID';   
const TEMPLATE_ID_CUSTOMER = 'YOUR_CUSTOMER_TEMPLATE_ID'; 
const TEMPLATE_ID_ADMIN = 'YOUR_ADMIN_TEMPLATE_ID'; 
const PUBLIC_KEY = 'YOUR_PUBLIC_KEY';   

export const sendStatusEmail = async (toEmail, type, link, data = {}) => {
  console.log(`[EmailJS] Preparing to send to ${toEmail}...`);

  const currentTime = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  let templateId = TEMPLATE_ID_CUSTOMER; 
  
  const emailParams = {
    to_email: toEmail,
    action_link: link,
    time: currentTime,
    name: data.name || "LawnPro Team",
    subject: "LawnPro Update",
    message: ""
  };

  switch (type) {
    case 'new_request':
      templateId = TEMPLATE_ID_ADMIN; 
      emailParams.subject = "New Job Request Incoming";
      emailParams.message = `${data.customerName || 'A user'} sent a request for:\n\n${data.servicesSummary || 'Details in app'}\n\nPlease review in app.`;
      break;

    case 'quote_received':
      emailParams.subject = "Action Required: New Quote Received";
      emailParams.message = "I have reviewed your property and generated a quote. Please click the link below to review and approve.";
      break;

    case 'confirmed':
      emailParams.subject = "Service Confirmed";
      emailParams.message = "Good news! Your service request has been accepted and scheduled.";
      break;

    // NEW: Handle the Reschedule Loop
    case 'reschedule_proposal':
      // Check who initiated to decide template (if notifying Admin, use Admin template)
      if (data.isToAdmin) {
        templateId = TEMPLATE_ID_ADMIN;
        emailParams.subject = "Reschedule Requested";
        emailParams.message = `Customer has proposed a new time: ${data.proposedInfo}. Review in app.`;
      } else {
        templateId = TEMPLATE_ID_CUSTOMER;
        emailParams.subject = "Reschedule Proposal Received";
        emailParams.message = `We have proposed a new time for your service: ${data.proposedInfo}. Please Accept or Counter in the dashboard.`;
      }
      break;

    case 'cancelled':
      emailParams.subject = "Service Cancelled";
      emailParams.message = "This service appointment has been cancelled.";
      break;

    default:
      emailParams.message = "You have a new notification.";
  }

  try {
    if (SERVICE_ID === 'YOUR_SERVICE_ID') {
      console.warn("[EmailJS] Simulating email...");
      console.log("TEMPLATE:", templateId, "DATA:", emailParams);
      return; 
    }
    await emailjs.send(SERVICE_ID, templateId, emailParams, PUBLIC_KEY);
    console.log('[EmailJS] Sent');
  } catch (error) {
    console.error('[EmailJS] Failed:', error);
  }
};