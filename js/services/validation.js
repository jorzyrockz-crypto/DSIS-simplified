/**
 * ICS Tracking & Monitoring Tool
 * Phase 2: ICS Database & Record Management — Validation Service
 */
'use strict';

const Validation = (() => {

  /* ----------------------------------------------------------
     Record Validation
     ---------------------------------------------------------- */
  function validateRecord(data) {
    const errors = {};

    // ICS Number
    if (!data.icsNumber || !String(data.icsNumber).trim()) {
      errors.icsNumber = 'ICS Number is required.';
    } else if (String(data.icsNumber).trim().length < 3) {
      errors.icsNumber = 'ICS Number is too short (minimum 3 characters).';
    }

    // Date Issued
    if (!data.dateIssued) {
      errors.dateIssued = 'Date Issued is required.';
    } else {
      const d = new Date(data.dateIssued + 'T00:00:00');
      if (isNaN(d.getTime())) {
        errors.dateIssued = 'Invalid date format.';
      } else {
        const today = new Date(); today.setHours(23, 59, 59, 999);
        if (d > today) errors.dateIssued = 'Date Issued cannot be in the future.';
        if (d.getFullYear() < 1990) errors.dateIssued = 'Date Issued seems too far in the past.';
      }
    }

    // Issued By
    if (!data.issuedBy || !String(data.issuedBy).trim()) {
      errors.issuedBy = '"Issued By" is required.';
    }

    // Received By (Recipient)
    if (!data.receivedBy || !String(data.receivedBy).trim()) {
      errors.receivedBy = 'Recipient name is required.';
    }

    // Items — at least one, and each item must be valid
    if (!data.items || data.items.length === 0) {
      errors.items = 'At least one item is required.';
    } else {
      const itemErrors = [];
      data.items.forEach((item, i) => {
        const ie = validateItem(item);
        if (Object.keys(ie).length > 0) itemErrors.push({ index: i, errors: ie });
      });
      if (itemErrors.length > 0) errors.itemErrors = itemErrors;
    }

    return errors;
  }

  /* ----------------------------------------------------------
     Draft Validation (lighter — only checks critical fields)
     ---------------------------------------------------------- */
  function validateDraft(data) {
    const errors = {};
    if (!data.icsNumber || !String(data.icsNumber).trim()) {
      errors.icsNumber = 'ICS Number is required even for drafts.';
    }
    return errors;
  }

  /* ----------------------------------------------------------
     Item Validation
     ---------------------------------------------------------- */
  function validateItem(item) {
    const errors = {};

    if (!item.description || !String(item.description).trim()) {
      errors.description = 'Description is required.';
    }

    const qty = parseFloat(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.quantity = 'Quantity must be greater than 0.';
    } else if (!Number.isFinite(qty)) {
      errors.quantity = 'Invalid quantity.';
    }

    const cost = parseFloat(item.unitCost);
    if (isNaN(cost) || cost < 0) {
      errors.unitCost = 'Unit cost cannot be negative.';
    }

    return errors;
  }

  /* ----------------------------------------------------------
     Field-Level Helpers
     ---------------------------------------------------------- */
  function isRequired(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  function isPositiveNumber(value) {
    const n = parseFloat(value);
    return !isNaN(n) && n > 0;
  }

  function isNonNegativeNumber(value) {
    const n = parseFloat(value);
    return !isNaN(n) && n >= 0;
  }

  function isValidDate(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    return !isNaN(d.getTime());
  }

  /** Returns true when the errors object has no keys. */
  function hasErrors(errors) {
    return errors && Object.keys(errors).length > 0;
  }

  /* ----------------------------------------------------------
     Inline Validation Helper (for form fields)
     Shows/hides error messages next to form fields.
     ---------------------------------------------------------- */
  function showFieldError(inputId, message) {
    const input   = document.getElementById(inputId);
    const errEl   = document.getElementById(inputId + '-error');
    if (input)  input.classList.toggle('input-error', !!message);
    if (errEl)  errEl.textContent = message || '';
  }

  function clearFieldErrors(formEl) {
    if (!formEl) return;
    formEl.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    formEl.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
  }

  function applyRecordErrors(errors) {
    // Map error keys to field IDs (prefixed with 'field-')
    const mapping = {
      icsNumber:  'field-icsNumber',
      dateIssued: 'field-dateIssued',
      issuedBy:   'field-issuedBy',
      receivedBy: 'field-receivedBy',
      receivedDate: 'field-receivedDate',
      receivedContact: 'field-receivedContact',
      recipientRemarks: 'field-recipientRemarks',
      items:      'field-items',
    };
    Object.entries(mapping).forEach(([key, fieldId]) => {
      showFieldError(fieldId, errors[key] || '');
    });
  }

  return {
    validateRecord, validateDraft, validateItem,
    isRequired, isPositiveNumber, isNonNegativeNumber, isValidDate,
    hasErrors,
    showFieldError, clearFieldErrors, applyRecordErrors,
  };
})();
