import React, { useState } from 'react';

/**
 * SendingWhatsappStatusCell Component
 * Clickable cell to send WhatsApp payment details message
 * Opens WhatsApp Web in a new tab with pre-filled message
 * Displays tick (✓) or cross (✗) indicator based on sendingWhatsappMessage status
 */
const SendingWhatsappStatusCell = (props) => {
  const { data, node } = props;
  const [isLoading, setIsLoading] = useState(false);

  const messageSent = data?.sendingWhatsappMessage === true;

  // Extract contact number from participant info
  const getPhoneNumber = () => {
    let phoneNumber =
      data?.participantInfo?.contactNumber ||
      data?.contactNo ||
      '';

    if (!phoneNumber) {
      return null;
    }

    // Remove spaces and non-digit characters
    phoneNumber = phoneNumber.replace(/\D/g, '');

    // Add Singapore country code if not present
    if (!phoneNumber.startsWith('65')) {
      phoneNumber = `65${phoneNumber}`;
    }

    return phoneNumber;
  };

  // Construct WhatsApp message
  const getWhatsAppMessage = () => {
    const participantName =
      data?.participantInfo?.name ||
      data?.name ||
      'Participant';

    const courseName =
      data?.courseInfo?.courseEngName ||
      data?.course ||
      'Course';

    const courseLocation =
      data?.courseInfo?.courseLocation ||
      data?.location ||
      '';

    const paymentMethod =
      data?.finalPaymentMethod ||
      data?.paymentMethod ||
      '';

    const registrationStatusNSA =
      data?.registrationStatus ||
      data?.status ||
      'Submitted';

    const registrationStatusILP =
      data?.status ||
      'Pending';

    const coursePrice =
      data?.courseInfo?.coursePrice ||
      data?.price ||
      '';

    const courseDuration =
      data?.courseInfo?.courseDuration ||
      data?.courseDuration ||
      '';

    const courseType =
      data?.courseInfo?.courseType ||
      data?.courseType ||
      '';

    const locationNumber =
      courseLocation === 'CT Hub'
        ? '90123174'
        : courseLocation === 'Tampines North Community Centre'
        ? '82000755'
        : courseLocation === 'Pasir Ris West Wellness Centre'
        ? '90123174'
        : '';

    const courseStartDate = courseDuration
      ? courseDuration.split(' to ')[0]
      : '';

    if (courseType === 'NSA') {
      if (
        registrationStatusNSA === 'Cancelled' ||
        registrationStatusNSA === 'Waiting List'
      ) {
        return `Hi ${participantName},

Thank you for registering for ${courseName}.

We're sorry to inform you that the course is currently full.

We appreciate your interest and will be in touch should a spot become available.

Thank you.`;
      }

      if (
        paymentMethod === 'Cash' ||
        paymentMethod === 'PayNow'
      ) {
        return `${courseName} - ${courseStartDate} - ${courseLocation} - Payment Details

Course subsidy applies to only Singaporeans and PRs aged 50yrs and above

Hi ${participantName},

Thank you for signing up for the above-mentioned class.

Details are as follows:
Price: ${coursePrice}

Payment to be made via PayNow to UEN no: T03SS0051L (En Community Services Society)

Under the "reference portion", kindly insert your name as per NRIC.

Once payment has gone through, take a screenshot of the payment receipt on your phone and send it over to us.

Thank you.`;
      }

      if (paymentMethod === 'SkillsFuture') {
        return `${participantName} - ${courseName} invoice for your SkillsFuture submission

HOW TO CLAIM SKILLSFUTURE

Please send us a screenshot of your submission once done.

Please ensure that the details are accurate before submission.

Guide to claim SkillsFuture:
https://ecss.org.sg/wp-content/uploads/2025/07/Step-by-step-guide-on-how-to-do-Skillsfuture-claim-submission.pdf`;
      }
    }

    if (
      courseType === 'ILP' ||
      courseType === 'Talks And Seminar' ||
      courseType === 'Others'
    ) {
      if (registrationStatusILP === 'Confirmed') {
        return `Hi ${participantName},

Thank you for registering for ${courseName} ${courseStartDate}.

We wish to confirm your place for the ILP programme ${courseName} on ${courseStartDate} at ${courseLocation}.

Please contact ${locationNumber} if you require more information.`;
      }

      if (registrationStatusILP === 'Cancelled') {
        return `Hi ${participantName},

Thank you for registering for ${courseName} ${courseStartDate}.

We're sorry to inform you that the course is currently full.

We appreciate your interest and will be in touch should a spot become available.

Thank you.`;
      }
    }

    return '';
  };

  const openWhatsAppWeb = async (e) => {
    e.stopPropagation();

    if (messageSent || isLoading) {
      return;
    }

    const phoneNumber = getPhoneNumber();

    if (!phoneNumber) {
      console.warn('No phone number found for participant');
      return;
    }

    setIsLoading(true);

    try {
      const message = getWhatsAppMessage();
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

      // Open WhatsApp
      window.open(
        whatsappUrl,
        '_blank',
        'noopener,noreferrer'
      );

      // Update data value — this triggers AG-Grid's onCellValueChanged on the parent
      node.setDataValue('sendingWhatsappMessage', true);

      // Trigger parent's cell change handler to save to backend
      const component = props.context?.componentInstance;
      if (component && typeof component.onCellValueChanged === 'function') {
        await component.onCellValueChanged({
          colDef: { headerName: 'Sending Payment Details', field: 'sendingWhatsappMessage' },
          column: { getColDef: () => ({ headerName: 'Sending Payment Details', field: 'sendingWhatsappMessage' }) },
          oldValue: false,
          value: true,
          data: data,
          node: node,
          api: props.api,
        });
      }

      console.log('✓ WhatsApp opened for:', phoneNumber);
    } catch (err) {
      console.error('Error opening WhatsApp:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="sending-whatsapp-status-cell"
      onClick={openWhatsAppWeb}
      title={
        messageSent
          ? 'WhatsApp message sent'
          : 'Click to send WhatsApp message'
      }
      style={{
        cursor: isLoading ? 'wait' : messageSent ? 'default' : 'pointer',
        userSelect: 'none',
      }}
    >
      {isLoading ? (
        <span className="status-loading">⏳</span>
      ) : messageSent ? (
        <span className="status-tick">✓</span>
      ) : (
        <span className="status-cross">
          ✗
        </span>
      )}
    </div>
  );
};

export default SendingWhatsappStatusCell;