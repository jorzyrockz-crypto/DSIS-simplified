/**
 * ICS Tracking & Monitoring Tool
 * Phase 3: New ICS Wizard & Item Management
 *
 * Guided workflow for creating/editing Inventory Custodian Slip (ICS) records.
 * Incorporates recipient autocomplete, compact slide-out item drawer with autocomplete,
 * duplicate/serial number warnings, bulk actions, reordering with single-level undo,
 * and global keyboard shortcuts.
 */
'use strict';

const NewICSPage = (() => {

  /* ----------------------------------------------------------
     State
     ---------------------------------------------------------- */
  let _state = {
    step:         1,
    totalSteps:   4,
    isDirty:      false,
    isSaving:     false,
    isEditMode:   false,
    editRecordId: null,
    draftId:      null,   // ID of the in-progress draft record
    formData: {
      icsNumber:    '',
      entityName:   '',
      fundCluster:  '',
      dateIssued:   Utils.today(),
      issuedBy:     '',
      remarks:      '',
      receivedBy:   '',
      position:     '',
      office:       '',
      receivedDate:   Utils.today(),
      receivedContact:'',
      recipientRemarks:'',
      items:        [],
    },
    // Phase 3 State Extensions
    lastAction:     null,   // for single-level undo: { type, data, index }
    currentItem:    null,   // currently editing item in drawer
    currentItemIdx: -1,     // -1 means creating new item
    recipientsList: [],     // cached recipients for autocomplete
    itemSuggestions:[],     // cached item description suggestions
  };

  let _autoSaveTimer   = null;
  let _formEl          = null;
  let _autosaveBarEl   = null;
  let _contextBody     = null;
  let _navProtected    = false;
  let _drawerEl        = null;
  let _undoBannerEl    = null;
  let _autosaveStatus  = 'saved';   // tracks current save state for Live Summary panel

  const STEP_DEFS = [
    { num: 1, label: 'General Information', desc: 'ICS number, date, entity'     },
    { num: 2, label: 'Recipient Details',   desc: 'Recipient name and office'    },
    { num: 3, label: 'Items & Asset list',  desc: 'List items, serials and EUL'  },
    { num: 4, label: 'Review & Confirm',    desc: 'Review details before saving' },
  ];

  /* ----------------------------------------------------------
     Navigation Protection
     ---------------------------------------------------------- */
  function _enableNavProtection() {
    if (_navProtected) return;
    _navProtected = true;
    window.addEventListener('beforeunload', _beforeUnload);
    Router.beforeNav(_beforeRouterNav);
  }

  function _disableNavProtection() {
    _navProtected = false;
    window.removeEventListener('beforeunload', _beforeUnload);
    Router.beforeNav(null); // clear hook
  }

  function _beforeUnload(e) {
    if (_state.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  async function _beforeRouterNav(from, to) {
    if (!_state.isDirty || (from !== '#new' && from !== '#edit')) return true;
    const confirmed = await UIKit.confirm({
      title:       'Unsaved Changes',
      message:     'You have unsaved changes. Leave without saving?',
      confirmText: 'Leave',
      cancelText:  'Stay',
      variant:     'warning',
    });
    if (confirmed) {
      _cleanup();
      return true;
    }
    return false; // cancel navigation
  }

  /* ----------------------------------------------------------
     Auto-Save
     ---------------------------------------------------------- */
  function _startAutoSave() {
    _stopAutoSave();
    _autoSaveTimer = setInterval(_autoSaveDraft, 3000);
  }

  function _stopAutoSave() {
    if (_autoSaveTimer) { clearInterval(_autoSaveTimer); _autoSaveTimer = null; }
  }

  async function _autoSaveDraft() {
    if (!_state.isDirty || _state.isSaving) return;

    _setAutosaveStatus('saving');
    _state.isSaving = true;

    try {
      _collectFormData();
      const data = { ..._state.formData, status: 'draft' };

      if (_state.draftId) {
        await RecordService.updateRecord(_state.draftId, data);
      } else {
        const draft = await RecordService.createRecord(data);
        _state.draftId = draft.id;
      }

      _state.isDirty = false;
      _setAutosaveStatus('saved');
    } catch (err) {
      console.error('[NewICSPage] Auto-save error', err);
      _setAutosaveStatus('error');
    } finally {
      _state.isSaving = false;
    }
  }

  function _setAutosaveStatus(status) {
    _autosaveStatus = status;

    if (_autosaveBarEl) {
      const messages = {
        saved:   'All changes saved',
        saving:  'Saving…',
        unsaved: 'Unsaved changes',
        error:   'Save failed — will retry',
      };
      _autosaveBarEl.className = `autosave-bar ${status}`;
      _autosaveBarEl.innerHTML = `<span class="save-dot"></span><span>${messages[status] || ''}</span>`;
    }

    _renderContextPanel(); // keep Live Summary panel in sync
  }

  /* ----------------------------------------------------------
     Form Data Collection
     ---------------------------------------------------------- */
  function _collectFormData() {
    if (!_formEl) return;

    const g = id => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    // Only collect if elements are present in the DOM (current step rendering)
    const elIcs = document.getElementById('field-icsNumber');
    if (elIcs) {
      _state.formData.icsNumber   = elIcs.value.trim();
      _state.formData.entityName  = g('field-entityName');
      _state.formData.fundCluster = g('field-fundCluster');
      _state.formData.dateIssued  = g('field-dateIssued');
      _state.formData.issuedBy    = g('field-issuedBy');
      _state.formData.remarks     = g('field-remarks');
    }

    const elRec = document.getElementById('field-receivedBy');
    if (elRec) {
      _state.formData.receivedBy   = elRec.value.trim();
      _state.formData.position     = g('field-position');
      _state.formData.office       = g('field-office');
      _state.formData.receivedDate = g('field-receivedDate');
      _state.formData.receivedContact = g('field-receivedContact');
      _state.formData.recipientRemarks = g('field-recipientRemarks');
    }
  }

  function _markDirty() {
    if (!_state.isDirty) {
      _state.isDirty = true;
      _setAutosaveStatus('unsaved');
    }
  }

  /* ----------------------------------------------------------
     Step Navigation
     ---------------------------------------------------------- */
  function _goToStep(num) {
    if (num < 1 || num > _state.totalSteps) return;
    _collectFormData();
    _state.step = num;
    _renderStepContent();
    _renderStepNav();
    _renderContextPanel();
    _updateStepNav();
    window.scrollTo({ top: 0 });
  }

  function _nextStep() {
    if (_state.step < _state.totalSteps) {
      if (!_validateCurrentStep()) return;
      _goToStep(_state.step + 1);
    }
  }

  function _prevStep() {
    if (_state.step > 1) _goToStep(_state.step - 1);
  }

  function _validateCurrentStep() {
    _collectFormData();
    Validation.clearFieldErrors(_formEl);

    if (_state.step === 1) {
      const errors = {};
      if (!_state.formData.icsNumber) errors.icsNumber = 'ICS Number is required.';
      if (!_state.formData.dateIssued) errors.dateIssued = 'Date Issued is required.';
      if (!_state.formData.issuedBy)   errors.issuedBy  = 'Issuing custodian name is required.';
      Validation.applyRecordErrors(errors);
      return !Validation.hasErrors(errors);
    }

    if (_state.step === 2) {
      const errors = {};
      if (!_state.formData.receivedBy) errors.receivedBy = 'Recipient name is required.';
      if (!_state.formData.receivedDate) errors.receivedDate = 'Received Date is required.';
      Validation.applyRecordErrors(errors);
      return !Validation.hasErrors(errors);
    }

    if (_state.step === 3) {
      if (_state.formData.items.length === 0) {
        Validation.showFieldError('field-items', 'Add at least one item.');
        return false;
      }
    }

    return true;
  }

  /* ----------------------------------------------------------
     Final Save
     ---------------------------------------------------------- */
  async function _saveRecord() {
    _collectFormData();
    Validation.clearFieldErrors(_formEl);

    const fullErrors = Validation.validateRecord(_state.formData);
    if (Validation.hasErrors(fullErrors)) {
      Validation.applyRecordErrors(fullErrors);
      UIKit.toast('Please fix the errors before saving.', 'error');
      return;
    }

    // Check duplicate ICS number
    const isUnique = await RecordService.isICSNumberUnique(
      _state.formData.icsNumber,
      _state.isEditMode ? _state.editRecordId : _state.draftId
    );
    if (!isUnique) {
      Validation.showFieldError('field-icsNumber', 'This ICS Number already exists.');
      UIKit.toast('Duplicate ICS Number detected.', 'error');
      _goToStep(1);
      return;
    }

    _state.isSaving = true;
    _setAutosaveStatus('saving');

    try {
      const data = { ..._state.formData, status: 'active' };

      let saved;
      if (_state.isEditMode && _state.editRecordId) {
        saved = await RecordService.updateRecord(_state.editRecordId, data);
        RecentRecords.addEdited(saved);
        UIKit.toast(`"${saved.icsNumber}" updated successfully.`, 'success');
      } else if (_state.draftId) {
        saved = await RecordService.updateRecord(_state.draftId, data);
        UIKit.toast(`"${saved.icsNumber}" saved successfully.`, 'success');
      } else {
        saved = await RecordService.createRecord(data);
        UIKit.toast(`"${saved.icsNumber}" created successfully.`, 'success');
      }

      _state.isDirty    = false;
      _state.isSaving   = false;
      _disableNavProtection();
      _cleanup();

      // Navigate to records page with the new record selected
      AppState.selectedRecordId = saved.id;
      Router.navigate('#records');

    } catch (err) {
      console.error('[NewICSPage] Save error', err);
      _state.isSaving = false;
      _setAutosaveStatus('error');
      UIKit.toast('Failed to save record. Please try again.', 'error');
    }
  }

  /* ----------------------------------------------------------
     Cleanup
     ---------------------------------------------------------- */
  function _cleanup() {
    _stopAutoSave();
    _disableNavProtection();
    _teardownUndoBanner();
    _teardownItemDrawer();

    _state = {
      step: 1, totalSteps: 4, isDirty: false, isSaving: false,
      isEditMode: false, editRecordId: null, draftId: null,
      formData: {
        icsNumber: '', entityName: '', fundCluster: '',
        dateIssued: Utils.today(), issuedBy: '', remarks: '',
        receivedBy: '', position: '', office: '',
        receivedDate: Utils.today(), receivedContact: '', recipientRemarks: '',
        items: [],
      },
      lastAction: null, currentItem: null, currentItemIdx: -1,
      recipientsList: [], itemSuggestions: [],
    };
    _formEl         = null;
    _autosaveBarEl  = null;
    _navProtected   = false;
    _autosaveStatus = 'saved';
  }

  /* ----------------------------------------------------------
     Item Management & Reordering
     ---------------------------------------------------------- */
  function _reorderItem(index, direction) {
    const items = [..._state.formData.items];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    // Swap items
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    _state.formData.items = items;
    _markDirty();
    _renderStepContent();
    _renderContextPanel();

    // Set Undo history
    _setUndoAction({
      type: 'reorder',
      data: { from: index, to: targetIdx }
    });
  }

  function _deleteItem(index) {
    const items = [..._state.formData.items];
    const deleted = items.splice(index, 1)[0];

    _state.formData.items = items;
    _markDirty();
    _renderStepContent();
    _renderContextPanel();

    // Set Undo history
    _setUndoAction({
      type: 'delete',
      data: { item: deleted, index }
    });

    _showUndoBanner(`Item "${deleted.description}" deleted.`);
  }

  function _duplicateItem(index) {
    const items = [..._state.formData.items];
    const orig = items[index];
    const dup = {
      ...orig,
      id: Utils.uuid(),
      inventoryItemNumber: '', // Clear unique fields
      serialNumber: '',
    };

    items.splice(index + 1, 0, dup);
    _state.formData.items = items;
    _markDirty();
    _renderStepContent();
    _renderContextPanel();

    // Set Undo history
    _setUndoAction({
      type: 'duplicate',
      data: { index: index + 1 }
    });

    _showUndoBanner(`Item duplicated.`);
  }

  function _copyPreviousItem() {
    const items = _state.formData.items;
    if (items.length === 0) {
      UIKit.toast('No previous item to copy.', 'warning');
      return;
    }

    const prev = items[items.length - 1];
    const copy = {
      ...prev,
      id: Utils.uuid(),
      inventoryItemNumber: '',
      serialNumber: '',
    };

    _state.formData.items.push(copy);
    _markDirty();
    _renderStepContent();
    _renderContextPanel();

    _setUndoAction({
      type: 'copy_previous',
      data: { index: _state.formData.items.length - 1 }
    });

    UIKit.toast('Copied previous item.', 'success');
  }

  function _addSimilarItem(index) {
    const items = _state.formData.items;
    const orig = items[index];
    _openItemDrawer({
      id: Utils.uuid(),
      description: orig.description,
      inventoryItemNumber: '',
      serialNumber: '',
      quantity: orig.quantity,
      unit: orig.unit,
      unitCost: orig.unitCost,
      totalCost: orig.totalCost,
      estimatedUsefulLife: orig.estimatedUsefulLife,
      remarks: orig.remarks,
    }, -1);
  }

  /* ----------------------------------------------------------
     Undo Management
     ---------------------------------------------------------- */
  function _setUndoAction(action) {
    _state.lastAction = action;
  }

  function _executeUndo() {
    if (!_state.lastAction) return;

    const { type, data } = _state.lastAction;
    const items = [..._state.formData.items];

    switch (type) {
      case 'delete':
        items.splice(data.index, 0, data.item);
        break;
      case 'duplicate':
      case 'copy_previous':
        items.splice(data.index, 1);
        break;
      case 'reorder':
        // Swap back
        const temp = items[data.from];
        items[data.from] = items[data.to];
        items[data.to] = temp;
        break;
    }

    _state.formData.items = items;
    _state.lastAction = null;
    _markDirty();
    _renderStepContent();
    _renderContextPanel();
    _hideUndoBanner();

    UIKit.toast('Action undone.', 'info');
  }

  function _showUndoBanner(message) {
    _setupUndoBanner();
    const textEl = _undoBannerEl.querySelector('.undo-text');
    if (textEl) textEl.textContent = message;
    _undoBannerEl.classList.add('visible');
  }

  function _hideUndoBanner() {
    if (_undoBannerEl) {
      _undoBannerEl.classList.remove('visible');
    }
  }

  function _setupUndoBanner() {
    if (_undoBannerEl) return;

    _undoBannerEl = document.createElement('div');
    _undoBannerEl.className = 'undo-banner';
    _undoBannerEl.innerHTML = `
      <span class="undo-text">Action completed.</span>
      <button class="undo-action-btn" type="button">Undo</button>
      <button class="undo-close-btn" type="button" aria-label="Dismiss">&times;</button>
    `;

    _undoBannerEl.querySelector('.undo-action-btn').addEventListener('click', _executeUndo);
    _undoBannerEl.querySelector('.undo-close-btn').addEventListener('click', _hideUndoBanner);
    document.body.appendChild(_undoBannerEl);
  }

  function _teardownUndoBanner() {
    if (_undoBannerEl) {
      _undoBannerEl.remove();
      _undoBannerEl = null;
    }
  }

  /* ----------------------------------------------------------
     Compact Item Editor Drawer
     ---------------------------------------------------------- */
  function _openItemDrawer(item = null, index = -1) {
    _setupItemDrawer();
    _state.currentItemIdx = index;

    if (item) {
      _state.currentItem = { ...item };
    } else {
      _state.currentItem = {
        id: Utils.uuid(),
        description: '', inventoryItemNumber: '', serialNumber: '',
        quantity: 1, unit: 'pc', unitCost: 0, totalCost: 0, estimatedUsefulLife: '5 Years',
        remarks: '',
      };
    }

    // Populate drawer form
    const d = id => _drawerEl.querySelector('#' + id);
    d('drawer-item-desc').value = _state.currentItem.description;
    d('drawer-item-inv').value  = _state.currentItem.inventoryItemNumber;
    d('drawer-item-serial').value = _state.currentItem.serialNumber;
    d('drawer-item-qty').value  = _state.currentItem.quantity;
    d('drawer-item-unit').value = _state.currentItem.unit;
    d('drawer-item-cost').value = _state.currentItem.unitCost;
    d('drawer-item-total').value = Utils.formatCurrency(_state.currentItem.totalCost);
    d('drawer-item-remarks').value = _state.currentItem.remarks;

    // Set EUL radio/dropdown value
    const eul = _state.currentItem.estimatedUsefulLife;
    const isStandard = ['1 Year', '2 Years', '3 Years', '5 Years', '10 Years'].includes(eul);
    const selectEl = d('drawer-item-eul-select');
    const customInp = d('drawer-item-eul-custom');

    if (isStandard) {
      selectEl.value = eul;
      customInp.value = '';
      customInp.style.display = 'none';
    } else {
      selectEl.value = 'Custom';
      customInp.value = eul || '';
      customInp.style.display = 'block';
    }

    // Set header title
    _drawerEl.querySelector('.item-drawer-title').textContent = index >= 0 ? 'Edit Item Details' : 'Add New Item';

    // Clear validation errors
    _drawerEl.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    _drawerEl.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    _drawerEl.querySelector('#drawer-inv-warning').textContent = '';
    _drawerEl.querySelector('#drawer-serial-warning').textContent = '';

    // Show drawer
    _drawerEl.classList.add('open');
    _drawerEl.querySelector('#drawer-item-desc').focus();
  }

  function _closeItemDrawer() {
    if (_drawerEl) {
      _drawerEl.classList.remove('open');
    }
  }

  function _recalcDrawerTotal() {
    const qty = parseFloat(_drawerEl.querySelector('#drawer-item-qty').value) || 0;
    const cost = parseFloat(_drawerEl.querySelector('#drawer-item-cost').value) || 0;
    const total = qty * cost;
    _drawerEl.querySelector('#drawer-item-total').value = Utils.formatCurrency(total);
  }

  async function _saveDrawerItem() {
    // Clear errors
    _drawerEl.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    _drawerEl.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    const d = id => _drawerEl.querySelector('#' + id);
    const desc = d('drawer-item-desc').value.trim();
    const inv = d('drawer-item-inv').value.trim();
    const serial = d('drawer-item-serial').value.trim();
    const qty = parseFloat(d('drawer-item-qty').value) || 0;
    const unit = d('drawer-item-unit').value.trim();
    const cost = parseFloat(d('drawer-item-cost').value) || 0;
    const remarks = d('drawer-item-remarks').value.trim();

    // Est Useful life
    let eul = d('drawer-item-eul-select').value;
    if (eul === 'Custom') {
      eul = d('drawer-item-eul-custom').value.trim();
    }

    // Validations
    let hasErr = false;
    const setErr = (id, msg) => {
      const el = d(id);
      if (el) el.classList.add('input-error');
      const err = _drawerEl.querySelector(`#${id}-error`);
      if (err) err.textContent = msg;
      hasErr = true;
    };

    if (!desc) setErr('drawer-item-desc', 'Description is required.');
    if (isNaN(qty) || qty <= 0) setErr('drawer-item-qty', 'Quantity must be greater than 0.');
    if (isNaN(cost) || cost < 0) setErr('drawer-item-cost', 'Unit cost cannot be negative.');

    // Duplicate inventory item checks
    if (inv) {
      // 1. Check duplicate within current form items
      const isFormDup = _state.formData.items.some((item, idx) =>
        item.inventoryItemNumber.trim().toLowerCase() === inv.toLowerCase() &&
        idx !== _state.currentItemIdx
      );
      if (isFormDup) {
        setErr('drawer-item-inv', 'Duplicate Inventory Number in this form.');
      } else {
        // 2. Check duplicate against existing DB records
        const allRecs = await RecordService.getAllRecords();
        const activeRecs = allRecs.filter(r => r.id !== (_state.isEditMode ? _state.editRecordId : _state.draftId));
        const isDbDup = activeRecs.some(r => r.items && r.items.some(item =>
          item.inventoryItemNumber.trim().toLowerCase() === inv.toLowerCase()
        ));
        if (isDbDup) {
          setErr('drawer-item-inv', 'Inventory Number is already assigned in database.');
        }
      }
    }

    if (hasErr) return;

    // All valid - compile item details
    const compiledItem = {
      id: _state.currentItem.id,
      description: desc,
      inventoryItemNumber: inv,
      serialNumber: serial,
      quantity: qty,
      unit: unit || 'pc',
      unitCost: cost,
      totalCost: qty * cost,
      estimatedUsefulLife: eul || '5 Years',
      remarks,
    };

    if (_state.currentItemIdx >= 0) {
      // Update item
      _state.formData.items[_state.currentItemIdx] = compiledItem;
    } else {
      // Add new item
      _state.formData.items.push(compiledItem);
    }

    _markDirty();
    _renderStepContent();
    _renderContextPanel();
    _closeItemDrawer();

    UIKit.toast(_state.currentItemIdx >= 0 ? 'Item updated.' : 'Item added.', 'success');
  }

  function _setupItemDrawer() {
    if (_drawerEl) return;

    _drawerEl = document.createElement('div');
    _drawerEl.className = 'item-drawer';
    _drawerEl.id = 'item-drawer';

    _drawerEl.innerHTML = `
      <div class="item-drawer-header">
        <h3 class="item-drawer-title">Add / Edit Item</h3>
        <button class="btn btn-ghost btn-icon btn-sm" id="drawer-close-btn" type="button" aria-label="Close panel">
          ${Components.icon('close')}
        </button>
      </div>

      <div class="item-drawer-body">
        <!-- Description suggestions container -->
        <div class="form-group autocomplete-container">
          <label class="form-label" for="drawer-item-desc">
            Description <span class="required-dot">*</span>
          </label>
          <input class="form-control" id="drawer-item-desc" type="text" placeholder="e.g. Laptop Computer Core i5..." autocomplete="off">
          <div class="field-error" id="drawer-item-desc-error"></div>
          <ul class="autocomplete-dropdown" id="desc-suggestions-list"></ul>
        </div>

        <div class="form-group">
          <label class="form-label" for="drawer-item-inv">
            Inventory Item Number
          </label>
          <div class="input-group">
            <input class="form-control" id="drawer-item-inv" type="text" placeholder="e.g. INV-2026-001" autocomplete="off">
            <button type="button" class="btn btn-secondary" id="auto-inv-btn">Auto</button>
          </div>
          <div class="field-error" id="drawer-item-inv-error"></div>
          <div style="font-size:var(--font-size-xs);color:var(--color-warning);margin-top:2px;" id="drawer-inv-warning"></div>
        </div>

        <div class="form-group">
          <label class="form-label" for="drawer-item-serial">Serial Number</label>
          <input class="form-control" id="drawer-item-serial" type="text" placeholder="e.g. SN-45812903" autocomplete="off">
          <div style="font-size:var(--font-size-xs);color:var(--color-warning);margin-top:2px;" id="drawer-serial-warning"></div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="drawer-item-qty">
              Quantity <span class="required-dot">*</span>
            </label>
            <input class="form-control" id="drawer-item-qty" type="number" value="1" min="1" step="any">
            <div class="field-error" id="drawer-item-qty-error"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="drawer-item-unit">Unit</label>
            <input class="form-control" id="drawer-item-unit" type="text" value="pc" placeholder="pc">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="drawer-item-cost">Unit Cost</label>
            <input class="form-control" id="drawer-item-cost" type="number" value="0" min="0" step="0.01">
            <div class="field-error" id="drawer-item-cost-error"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="drawer-item-total">Total Cost</label>
            <input class="form-control" id="drawer-item-total" type="text" readonly tabindex="-1" style="background:var(--color-surface-alt)">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="drawer-item-eul-select">Estimated Useful Life</label>
          <select class="form-control" id="drawer-item-eul-select">
            <option value="1 Year">1 Year</option>
            <option value="2 Years">2 Years</option>
            <option value="3 Years">3 Years</option>
            <option value="5 Years">5 Years</option>
            <option value="10 Years">10 Years</option>
            <option value="Custom">Custom Life</option>
          </select>
          <input class="form-control" id="drawer-item-eul-custom" type="text" placeholder="e.g. 15 Years" style="display:none;margin-top:var(--space-2)">
        </div>

        <div class="form-group">
          <label class="form-label" for="drawer-item-remarks">Remarks</label>
          <textarea class="form-control" id="drawer-item-remarks" placeholder="Item-specific notes..." rows="2" maxlength="300"></textarea>
        </div>
      </div>

      <div class="item-drawer-footer">
        <button class="btn btn-ghost" id="drawer-cancel-btn" type="button">Cancel</button>
        <button class="btn btn-primary" id="drawer-save-btn" type="button">Save Item</button>
      </div>
    `;

    document.body.appendChild(_drawerEl);

    // Event listeners
    _drawerEl.querySelector('#drawer-close-btn').addEventListener('click', _closeItemDrawer);
    _drawerEl.querySelector('#drawer-cancel-btn').addEventListener('click', _closeItemDrawer);
    _drawerEl.querySelector('#drawer-save-btn').addEventListener('click', _saveDrawerItem);

    // Recalculations
    const qtyInp = _drawerEl.querySelector('#drawer-item-qty');
    const costInp = _drawerEl.querySelector('#drawer-item-cost');
    qtyInp.addEventListener('input', _recalcDrawerTotal);
    costInp.addEventListener('input', _recalcDrawerTotal);

    // EUL Change Custom
    const eulSelect = _drawerEl.querySelector('#drawer-item-eul-select');
    const eulCustom = _drawerEl.querySelector('#drawer-item-eul-custom');
    eulSelect.addEventListener('change', () => {
      eulCustom.style.display = eulSelect.value === 'Custom' ? 'block' : 'none';
      if (eulSelect.value === 'Custom') eulCustom.focus();
    });

    // Auto generate inventory item number
    _drawerEl.querySelector('#auto-inv-btn').addEventListener('click', async () => {
      const year = _state.formData.dateIssued ? new Date(_state.formData.dateIssued).getFullYear() : Utils.currentYear();
      const allRecs = await RecordService.getAllRecords();
      let maxSeq = 0;
      allRecs.forEach(r => {
        if (!r.items) return;
        r.items.forEach(it => {
          const m = (it.inventoryItemNumber || '').match(/^INV-(\d{4})-(\d+)$/i);
          if (m && parseInt(m[1]) === year) {
            maxSeq = Math.max(maxSeq, parseInt(m[2]));
          }
        });
      });
      _drawerEl.querySelector('#drawer-item-inv').value = `INV-${year}-${String(maxSeq + 1).padStart(3, '0')}`;
    });

    // Check duplicate serial warning in DB
    const serialInp = _drawerEl.querySelector('#drawer-item-serial');
    serialInp.addEventListener('input', Utils.debounce(async () => {
      const serial = serialInp.value.trim();
      const warningEl = _drawerEl.querySelector('#drawer-serial-warning');
      warningEl.textContent = '';
      if (!serial) return;

      const allRecs = await RecordService.getAllRecords();
      const activeRecs = allRecs.filter(r => r.id !== (_state.isEditMode ? _state.editRecordId : _state.draftId));
      const hasDup = activeRecs.some(r => r.items && r.items.some(item =>
        item.serialNumber && item.serialNumber.trim().toLowerCase() === serial.toLowerCase()
      ));
      if (hasDup) {
        warningEl.textContent = '⚠️ Duplicate serial number detected in database.';
      }
    }, 300));

    // Description Suggestions Autocomplete Setup
    const descInp = _drawerEl.querySelector('#drawer-item-desc');
    const suggList = _drawerEl.querySelector('#desc-suggestions-list');

    descInp.addEventListener('input', Utils.debounce(async () => {
      const query = descInp.value.trim();
      suggList.innerHTML = '';
      suggList.classList.remove('active');
      if (query.length < 2) return;

      const suggestions = await RecordService.getInventorySuggestions(query);
      if (suggestions.length === 0) return;

      suggestions.forEach(s => {
        const li = document.createElement('li');
        li.className = 'autocomplete-item';
        li.innerHTML = `
          <span class="ac-title">${Utils.escapeHtml(s.description)}</span>
          <span class="ac-subtitle">Unit: ${s.unit} | EUL: ${s.estimatedUsefulLife} | Cost: ${Utils.formatCurrency(s.unitCost)}</span>
        `;
        li.addEventListener('click', () => {
          descInp.value = s.description;
          _drawerEl.querySelector('#drawer-item-unit').value = s.unit || 'pc';
          _drawerEl.querySelector('#drawer-item-cost').value = s.unitCost || 0;

          const standardEul = ['1 Year', '2 Years', '3 Years', '5 Years', '10 Years'].includes(s.estimatedUsefulLife);
          if (standardEul) {
            eulSelect.value = s.estimatedUsefulLife;
            eulCustom.style.display = 'none';
          } else {
            eulSelect.value = 'Custom';
            eulCustom.value = s.estimatedUsefulLife;
            eulCustom.style.display = 'block';
          }

          _recalcDrawerTotal();
          suggList.innerHTML = '';
          suggList.classList.remove('active');
        });
        suggList.appendChild(li);
      });
      suggList.classList.add('active');
    }, 250));

    // Hide suggestions on document click
    document.addEventListener('click', e => {
      if (e.target !== descInp && e.target !== suggList && !suggList.contains(e.target)) {
        suggList.innerHTML = '';
        suggList.classList.remove('active');
      }
    });
  }

  function _teardownItemDrawer() {
    if (_drawerEl) {
      _drawerEl.remove();
      _drawerEl = null;
    }
  }

  /* ----------------------------------------------------------
     Recipient Autocomplete
     ---------------------------------------------------------- */
  async function _setupRecipientAutocomplete() {
    const recInp = document.getElementById('field-receivedBy');
    const dropdown = document.getElementById('recipient-autocomplete-dropdown');
    if (!recInp || !dropdown) return;

    _state.recipientsList = await RecordService.getDistinctRecipients();

    recInp.addEventListener('input', () => {
      const val = recInp.value.trim().toLowerCase();
      dropdown.innerHTML = '';
      dropdown.classList.remove('active');

      if (!val) return;

      const filtered = _state.recipientsList.filter(r =>
        r.receivedBy.toLowerCase().includes(val)
      );

      if (filtered.length === 0) return;

      filtered.forEach(r => {
        const li = document.createElement('li');
        li.className = 'autocomplete-item';
        li.innerHTML = `
          <span class="ac-title">${Utils.escapeHtml(r.receivedBy)}</span>
          <span class="ac-subtitle">${Utils.escapeHtml(r.position)} · ${Utils.escapeHtml(r.office)}</span>
        `;
        li.addEventListener('click', () => {
          recInp.value = r.receivedBy;
          document.getElementById('field-position').value = r.position || '';
          document.getElementById('field-office').value   = r.office || '';
          if (document.getElementById('field-receivedContact')) {
            document.getElementById('field-receivedContact').value = r.receivedContact || '';
          }
          dropdown.innerHTML = '';
          dropdown.classList.remove('active');
          _markDirty();
          // Focus next date field
          const dateEl = document.getElementById('field-receivedDate');
          if (dateEl) dateEl.focus();
        });
        dropdown.appendChild(li);
      });
      dropdown.classList.add('active');
    });

    document.addEventListener('click', e => {
      if (e.target !== recInp && e.target !== dropdown && !dropdown.contains(e.target)) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('active');
      }
    });
  }

  /* ----------------------------------------------------------
     Step Renderers
     ---------------------------------------------------------- */
  function _renderStepContent() {
    const body = document.getElementById('form-step-body');
    if (!body) return;
    body.innerHTML = '';

    switch (_state.step) {
      case 1: _renderStep1(body); break;
      case 2: _renderStep2(body); break;
      case 3: _renderStep3(body); break;
      case 4: _renderStep4(body); break;
    }

    // Re-wire dirty listeners
    body.querySelectorAll('input, textarea, select').forEach(el => {
      el.addEventListener('input', _markDirty);
      el.addEventListener('change', _markDirty);
    });
  }

  function _renderStep1(container) {
    const fd = _state.formData;
    container.innerHTML = `
      <div class="form-section">
        <div class="form-section-title">${Components.icon('records')} ICS General Info</div>
        
        <div class="form-group" style="position:relative">
          <label class="form-label" for="field-icsNumber">
            ICS Number <span class="required-dot">*</span>
          </label>
          <div class="input-group">
            <input class="form-control" id="field-icsNumber" type="text"
                   value="${Utils.escapeHtml(fd.icsNumber)}"
                   placeholder="e.g. 2026-07-001"
                   autocomplete="off" maxlength="40">
            <button type="button" class="btn btn-secondary" id="auto-ics-btn"
                    title="Auto-generate ICS number">Auto</button>
          </div>
          <div class="input-indicator" id="ics-uniqueness-indicator"></div>
          <div class="field-error" id="field-icsNumber-error"></div>
          <div class="form-hint">Format: YYYY-MM-### (sequence resets every year)</div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-dateIssued">
              Date Issued <span class="required-dot">*</span>
            </label>
            <input class="form-control" id="field-dateIssued" type="date"
                   value="${fd.dateIssued}" max="${Utils.today()}">
            <div class="field-error" id="field-dateIssued-error"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="field-fundCluster">Fund Cluster</label>
            <input class="form-control" id="field-fundCluster" type="text"
                   value="${Utils.escapeHtml(fd.fundCluster)}"
                   placeholder="e.g. 101" maxlength="20"
                   list="fund-cluster-list">
            <datalist id="fund-cluster-list">
              <option value="101"><option value="01"><option value="02"><option value="07">
            </datalist>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="field-entityName">Entity Name</label>
          <input class="form-control" id="field-entityName" type="text"
                 value="${Utils.escapeHtml(fd.entityName)}"
                 placeholder="e.g. Department of Education" maxlength="120">
        </div>

        <div class="form-group">
          <label class="form-label" for="field-issuedBy">
            Issued By <span class="required-dot">*</span>
          </label>
          <input class="form-control" id="field-issuedBy" type="text"
                 value="${Utils.escapeHtml(fd.issuedBy)}"
                 placeholder="Name of Supply Officer / Property Custodian" maxlength="100">
          <div class="field-error" id="field-issuedBy-error"></div>
        </div>

        <div class="form-group">
          <label class="form-label" for="field-remarks">Remarks</label>
          <textarea class="form-control" id="field-remarks"
                    placeholder="General remarks or notes..." rows="3"
                    maxlength="500">${Utils.escapeHtml(fd.remarks)}</textarea>
        </div>
      </div>
    `;

    const icsInput = document.getElementById('field-icsNumber');
    const indicator = document.getElementById('ics-uniqueness-indicator');

    // Auto-generate click
    document.getElementById('auto-ics-btn').addEventListener('click', async () => {
      const suggested = await RecordService.getNextICSNumber();
      icsInput.value = suggested;
      _markDirty();
      checkICSNumberUniqueness(suggested);
    });

    // Real-time duplicate verification with debounce
    icsInput.addEventListener('input', Utils.debounce(() => {
      const val = icsInput.value.trim();
      checkICSNumberUniqueness(val);
    }, 300));

    async function checkICSNumberUniqueness(icsNum) {
      indicator.innerHTML = '';
      indicator.className = 'input-indicator';

      if (!icsNum) return;

      const isUnique = await RecordService.isICSNumberUnique(
        icsNum,
        _state.isEditMode ? _state.editRecordId : _state.draftId
      );

      if (isUnique) {
        indicator.classList.add('valid');
        indicator.innerHTML = `✓ <span style="font-size:10px;margin-left:4px;font-weight:600">Available</span>`;
      } else {
        indicator.classList.add('invalid');
        indicator.innerHTML = `✕ <span style="font-size:10px;margin-left:4px;font-weight:600">Taken</span>`;
      }
    }

    // Call check immediately if it is pre-populated
    if (fd.icsNumber) checkICSNumberUniqueness(fd.icsNumber);
  }

  function _renderStep2(container) {
    const fd = _state.formData;
    container.innerHTML = `
      <div class="form-section">
        <div class="form-section-title">${Components.icon('user')} Recipient Information</div>
        
        <div class="form-group autocomplete-container">
          <label class="form-label" for="field-receivedBy">
            Recipient Name <span class="required-dot">*</span>
          </label>
          <input class="form-control" id="field-receivedBy" type="text"
                 value="${Utils.escapeHtml(fd.receivedBy)}"
                 placeholder="Search or enter recipient name..." maxlength="100" autocomplete="off">
          <div class="field-error" id="field-receivedBy-error"></div>
          <ul class="autocomplete-dropdown" id="recipient-autocomplete-dropdown"></ul>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-position">Position / Designation</label>
            <input class="form-control" id="field-position" type="text"
                   value="${Utils.escapeHtml(fd.position)}"
                   placeholder="e.g. Administrative Officer II" maxlength="100">
          </div>
          <div class="form-group">
            <label class="form-label" for="field-office">Office / Division</label>
            <input class="form-control" id="field-office" type="text"
                   value="${Utils.escapeHtml(fd.office)}"
                   placeholder="e.g. Supply Office" maxlength="100">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-receivedDate">
              Received Date <span class="required-dot">*</span>
            </label>
            <input class="form-control" id="field-receivedDate" type="date"
                   value="${fd.receivedDate || Utils.today()}" max="${Utils.today()}">
            <div class="field-error" id="field-receivedDate-error"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="field-receivedContact">Contact Number (Optional)</label>
            <input class="form-control" id="field-receivedContact" type="tel"
                   value="${Utils.escapeHtml(fd.receivedContact)}"
                   placeholder="e.g. 0917-123-4567" maxlength="30">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="field-recipientRemarks">Remarks / Designations Notes</label>
          <textarea class="form-control" id="field-recipientRemarks"
                    placeholder="Recipient-specific notes..." rows="3"
                    maxlength="500">${Utils.escapeHtml(fd.recipientRemarks)}</textarea>
        </div>
      </div>
    `;

    _setupRecipientAutocomplete();
  }

  function _renderStep3(container) {
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'form-section-title';
    sectionTitle.innerHTML = `${Components.icon('box')} Item List & Assets`;

    // Bulk toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'items-bulk-bar';
    toolbar.innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-drawer-add" type="button">
        ${Components.icon('newics')} Add Item
      </button>
      <button class="btn btn-secondary btn-sm" id="btn-copy-prev" type="button">
        ${Components.icon('list')} Copy Previous
      </button>
    `;

    container.appendChild(sectionTitle);
    container.appendChild(toolbar);

    // Desktop view table
    const tableWrap = document.createElement('div');
    tableWrap.className = 'items-table-wrap';
    tableWrap.id = 'items-table-wrap';
    tableWrap.innerHTML = `
      <table class="items-table">
        <thead>
          <tr>
            <th class="item-num">#</th>
            <th style="min-width:140px">Description</th>
            <th>Inventory No.</th>
            <th>Serial No.</th>
            <th style="text-align:right">Qty</th>
            <th>Unit</th>
            <th style="text-align:right">Unit Cost</th>
            <th style="text-align:right">Total Cost</th>
            <th>Est Useful Life</th>
            <th style="text-align:center;width:120px">Actions</th>
            <th style="width:50px;text-align:center">Order</th>
          </tr>
        </thead>
        <tbody id="items-tbody"></tbody>
      </table>
    `;
    container.appendChild(tableWrap);

    // Mobile view list
    const mobileList = document.createElement('div');
    mobileList.className = 'items-mobile-list';
    mobileList.id = 'items-mobile-list';
    container.appendChild(mobileList);

    // Populate rows and cards
    const tbody = tableWrap.querySelector('tbody');
    const items = _state.formData.items;

    if (items.length === 0) {
      const empty = document.createElement('tr');
      empty.innerHTML = `<td colspan="11" style="text-align:center;padding:var(--space-6);color:var(--color-text-tertiary);">No items added yet. Click "Add Item" to start.</td>`;
      tbody.appendChild(empty);

      const mEmpty = document.createElement('div');
      mEmpty.className = 'empty-state';
      mEmpty.innerHTML = `
        <div class="empty-title" style="font-size:var(--font-size-sm)">No items added yet</div>
      `;
      mobileList.appendChild(mEmpty);
    } else {
      items.forEach((item, idx) => {
        // Build table row
        const tr = document.createElement('tr');
        tr.dataset.itemId = item.id;
        tr.innerHTML = `
          <td class="item-num">${idx + 1}</td>
          <td style="font-weight:var(--font-weight-semibold);color:var(--color-text-primary)">
            ${Utils.escapeHtml(item.description)}
          </td>
          <td>${Utils.escapeHtml(item.inventoryItemNumber) || '—'}</td>
          <td>${Utils.escapeHtml(item.serialNumber) || '—'}</td>
          <td style="text-align:right">${item.quantity}</td>
          <td>${Utils.escapeHtml(item.unit)}</td>
          <td style="text-align:right">${Utils.formatCurrency(item.unitCost)}</td>
          <td style="text-align:right;font-weight:var(--font-weight-semibold);color:var(--color-text-primary)">
            ${Utils.formatCurrency(item.totalCost)}
          </td>
          <td>${Utils.escapeHtml(item.estimatedUsefulLife)}</td>
          <td style="text-align:center">
            <div style="display:flex;gap:4px;justify-content:center">
              <button class="btn btn-ghost btn-sm btn-icon btn-row-edit" type="button" title="Edit Item">${Components.icon('records')}</button>
              <button class="btn btn-ghost btn-sm btn-icon btn-row-dup" type="button" title="Duplicate Item">${Components.icon('list')}</button>
              <button class="btn btn-ghost btn-sm btn-icon btn-row-del" type="button" title="Delete Item" style="color:var(--color-danger)">${Components.icon('close')}</button>
            </div>
          </td>
          <td>
            <div class="reorder-btns">
              <button class="reorder-btn btn-up" type="button" title="Move Up" ${idx === 0 ? 'disabled' : ''}>▲</button>
              <button class="reorder-btn btn-down" type="button" title="Move Down" ${idx === items.length - 1 ? 'disabled' : ''}>▼</button>
            </div>
          </td>
        `;

        // Row button events
        tr.querySelector('.btn-row-edit').addEventListener('click', () => _openItemDrawer(item, idx));
        tr.querySelector('.btn-row-dup').addEventListener('click', () => _duplicateItem(idx));
        tr.querySelector('.btn-row-del').addEventListener('click', () => _deleteItem(idx));
        tr.querySelector('.btn-up').addEventListener('click', () => _reorderItem(idx, -1));
        tr.querySelector('.btn-down').addEventListener('click', () => _reorderItem(idx, 1));
        tbody.appendChild(tr);

        // Build mobile card
        const card = document.createElement('div');
        card.className = 'item-mobile-card';
        card.innerHTML = `
          <div class="item-mobile-card-header">
            <div class="item-mobile-card-title">${Utils.escapeHtml(item.description)}</div>
            <div class="reorder-btns" style="flex-direction:row;gap:6px">
              <button class="reorder-btn btn-up" type="button" ${idx === 0 ? 'disabled' : ''}>▲</button>
              <button class="reorder-btn btn-down" type="button" ${idx === items.length - 1 ? 'disabled' : ''}>▼</button>
            </div>
          </div>
          <div class="item-mobile-card-meta">
            <span><strong>Qty:</strong> ${item.quantity} ${item.unit}</span>
            <span><strong>Unit Cost:</strong> ${Utils.formatCurrency(item.unitCost)}</span>
            <span><strong>Inv:</strong> ${Utils.escapeHtml(item.inventoryItemNumber) || '—'}</span>
            <span><strong>SN:</strong> ${Utils.escapeHtml(item.serialNumber) || '—'}</span>
            <span><strong>EUL:</strong> ${item.estimatedUsefulLife}</span>
          </div>
          <div class="item-mobile-card-footer">
            <div class="item-mobile-card-cost">${Utils.formatCurrency(item.totalCost)}</div>
            <div class="item-mobile-card-actions">
              <button class="btn btn-ghost btn-icon btn-sm btn-card-edit" type="button">${Components.icon('records')}</button>
              <button class="btn btn-ghost btn-icon btn-sm btn-card-dup" type="button">${Components.icon('list')}</button>
              <button class="btn btn-ghost btn-icon btn-sm btn-card-del" style="color:var(--color-danger)" type="button">${Components.icon('close')}</button>
            </div>
          </div>
        `;
        card.querySelector('.btn-card-edit').addEventListener('click', () => _openItemDrawer(item, idx));
        card.querySelector('.btn-card-dup').addEventListener('click', () => _duplicateItem(idx));
        card.querySelector('.btn-card-del').addEventListener('click', () => _deleteItem(idx));
        card.querySelector('.btn-up').addEventListener('click', () => _reorderItem(idx, -1));
        card.querySelector('.btn-down').addEventListener('click', () => _reorderItem(idx, 1));
        mobileList.appendChild(card);
      });
    }

    // Totals bar
    const totalsBar = document.createElement('div');
    totalsBar.className = 'items-totals';
    totalsBar.id = 'items-totals';
    const totalCost = items.reduce((s, i) => s + i.totalCost, 0);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    totalsBar.innerHTML = `
      <span class="total-label">Total Items:</span>
      <span class="total-value">${items.length}</span>
      <span class="total-label">Total Qty:</span>
      <span class="total-value">${totalQty}</span>
      <span class="total-label">Total Cost:</span>
      <span class="total-value">${Utils.formatCurrency(totalCost)}</span>
    `;
    container.appendChild(totalsBar);

    // Step error message
    const err = document.createElement('div');
    err.className = 'field-error';
    err.id = 'field-items';
    container.appendChild(err);

    // Wire main buttons
    document.getElementById('btn-drawer-add').addEventListener('click', () => _openItemDrawer(null, -1));
    document.getElementById('btn-copy-prev').addEventListener('click', _copyPreviousItem);
  }

  function _renderStep4(container) {
    _collectFormData();
    const fd = _state.formData;

    const totalCost = (fd.items || []).reduce((s, i) => s + (parseFloat(i.totalCost) || 0), 0);
    const totalQty  = (fd.items || []).reduce((s, i) => s + (parseFloat(i.quantity)  || 0), 0);

    container.innerHTML = '';

    // Step 1 review
    const genBlock = _reviewBlock('General Information', [
      ['ICS Number',   fd.icsNumber   || '—'],
      ['Date Issued',  Utils.formatDate(fd.dateIssued)],
      ['Entity Name',  fd.entityName  || '—'],
      ['Fund Cluster', fd.fundCluster || '—'],
      ['Issued By',    fd.issuedBy    || '—'],
      ['Remarks',      fd.remarks     || '—'],
    ]);
    container.appendChild(genBlock);

    // Step 2 review
    const recBlock = _reviewBlock('Recipient Details', [
      ['Recipient Name', fd.receivedBy || '—'],
      ['Position',       fd.position   || '—'],
      ['Office',         fd.office     || '—'],
      ['Received Date',  Utils.formatDate(fd.receivedDate)],
      ['Contact No.',    fd.receivedContact || '—'],
      ['Remarks',        fd.recipientRemarks || '—'],
    ]);
    container.appendChild(recBlock);

    // Step 3 review
    const itemsBlock = document.createElement('div');
    itemsBlock.className = 'review-block';
    itemsBlock.innerHTML = `<div class="review-block-title">Items (${fd.items.length})</div>`;

    fd.items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'review-item-row';
      row.innerHTML = `
        <span class="review-item-num">${i + 1}</span>
        <div class="review-item-desc">
          ${Utils.escapeHtml(item.description) || '(No description)'}
          <div class="review-item-meta">
            Qty: ${item.quantity} ${item.unit}
            ${item.serialNumber ? '· S/N: ' + Utils.escapeHtml(item.serialNumber) : ''}
            ${item.inventoryItemNumber ? '· Inv: ' + Utils.escapeHtml(item.inventoryItemNumber) : ''}
            ${item.estimatedUsefulLife ? '· EUL: ' + Utils.escapeHtml(item.estimatedUsefulLife) : ''}
          </div>
        </div>
        <span class="review-item-cost">${Utils.formatCurrency(item.totalCost)}</span>
      `;
      itemsBlock.appendChild(row);
    });

    const totalRow = document.createElement('div');
    totalRow.className = 'review-total-row';
    totalRow.innerHTML = `
      <span>Total (${totalQty} items)</span>
      <span>${Utils.formatCurrency(totalCost)}</span>
    `;
    itemsBlock.appendChild(totalRow);
    container.appendChild(itemsBlock);
  }

  function _reviewBlock(title, rows) {
    const block = document.createElement('div');
    block.className = 'review-block';
    block.innerHTML = `<div class="review-block-title">${title}</div>`;
    rows.forEach(([key, val]) => {
      const row = document.createElement('div');
      row.className = 'detail-row';
      row.innerHTML = `<span class="detail-key">${key}</span><span class="detail-val">${Utils.escapeHtml(String(val))}</span>`;
      block.appendChild(row);
    });
    return block;
  }

  /* ----------------------------------------------------------
     Horizontal Step Progress Navigator
     ---------------------------------------------------------- */
  function _renderStepNav() {
    const nav = document.getElementById('wizard-progress-nav');
    if (!nav) return;
    nav.innerHTML = '';

    // Inline check SVG for completed state
    const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    // Short labels for compact display
    const shortLabels = ['General', 'Recipient', 'Items', 'Review'];

    STEP_DEFS.forEach((def, i) => {
      // Determine state
      let stepState;
      if (def.num < _state.step)      stepState = 'completed';
      else if (def.num === _state.step) stepState = 'active';
      else                             stepState = 'upcoming';

      // Step element
      const stepEl = document.createElement('div');
      stepEl.className = `wpn-step ${stepState}`;
      stepEl.setAttribute('role', 'button');
      stepEl.setAttribute('aria-label', `Step ${def.num}: ${def.label}`);
      stepEl.setAttribute('tabindex', stepState === 'completed' ? '0' : '-1');

      // Circle
      const circle = document.createElement('div');
      circle.className = 'wpn-circle';
      circle.innerHTML = stepState === 'completed' ? checkSvg : String(def.num);

      // Label
      const label = document.createElement('span');
      label.className = 'wpn-label';
      label.textContent = shortLabels[i] || def.label;

      stepEl.appendChild(circle);
      stepEl.appendChild(label);

      // Click: only completed steps are navigable
      if (stepState === 'completed') {
        stepEl.addEventListener('click', () => _goToStep(def.num));
        stepEl.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _goToStep(def.num); }
        });
      }

      nav.appendChild(stepEl);

      // Connector after every step except the last
      if (i < STEP_DEFS.length - 1) {
        const connector = document.createElement('div');
        connector.className = `wpn-connector${stepState === 'completed' ? ' completed' : ''}`;
        nav.appendChild(connector);
      }
    });
  }

  /* ----------------------------------------------------------
     Navigation Controls
     ---------------------------------------------------------- */
  function _updateStepNav() {
    const prevBtn = document.getElementById('form-prev-btn');
    const nextBtn = document.getElementById('form-next-btn');
    const saveBtn = document.getElementById('form-save-btn');
    const draftBtn = document.getElementById('form-draft-btn');

    if (prevBtn) prevBtn.disabled = _state.step === 1;

    if (nextBtn) nextBtn.style.display = _state.step < _state.totalSteps ? '' : 'none';
    if (saveBtn) saveBtn.style.display = _state.step === _state.totalSteps ? '' : 'none';
    if (draftBtn) draftBtn.style.display = 'block'; // Always show Save Draft
  }

  /* ----------------------------------------------------------
     Live Summary Panel — Right Context Panel
     Helper builders (all pure DOM, no template literals with
     user data to avoid XSS via innerHTML).
     ---------------------------------------------------------- */

  function _lsSectionLabel(text) {
    const el = document.createElement('p');
    el.className = 'ls-section-label';
    el.textContent = text;
    return el;
  }

  function _lsRow(key, val, isEmpty) {
    const row = document.createElement('div');
    row.className = 'ls-row';
    const keyEl = document.createElement('span');
    keyEl.className = 'ls-key';
    keyEl.textContent = key;
    const valEl = document.createElement('span');
    valEl.className = isEmpty ? 'ls-val empty' : 'ls-val';
    valEl.textContent = val;
    row.appendChild(keyEl);
    row.appendChild(valEl);
    return row;
  }

  function _lsCheckRow(text, ok) {
    const row = document.createElement('div');
    row.className = `ls-check-row ${ok ? 'ok' : 'warn'}`;
    const iconEl = document.createElement('span');
    iconEl.className = 'ls-check-icon';
    iconEl.textContent = ok ? '✓' : '⚠';
    const textEl = document.createElement('span');
    textEl.className = 'ls-check-text';
    textEl.textContent = text;
    row.appendChild(iconEl);
    row.appendChild(textEl);
    return row;
  }

  function _lsProgressCard() {
    const pct = Math.round((_state.step / _state.totalSteps) * 100);
    const card = document.createElement('div');
    card.className = 'inspector-card';
    const label = _lsSectionLabel('Progress');
    label.style.marginBottom = '8px';
    const track = document.createElement('div');
    track.className = 'ls-progress-track';
    const fill = document.createElement('div');
    fill.className = 'ls-progress-fill';
    fill.style.width = `${pct}%`;
    track.appendChild(fill);
    const pctLabel = document.createElement('p');
    pctLabel.className = 'ls-progress-label';
    pctLabel.textContent = `${pct}% Complete · Step ${_state.step} of ${_state.totalSteps}`;
    card.appendChild(label);
    card.appendChild(track);
    card.appendChild(pctLabel);
    return card;
  }

  function _lsValidationCard() {
    const fd = _state.formData;
    const s1 = !!(fd.icsNumber && fd.dateIssued && fd.issuedBy);
    const s2 = !!(fd.receivedBy && fd.receivedDate);
    const s3 = fd.items.length > 0;
    const all = s1 && s2 && s3;

    const card = document.createElement('div');
    card.className = 'inspector-card';
    const label = _lsSectionLabel('Validation');
    label.style.marginBottom = '8px';
    card.appendChild(label);
    [
      [s1,  'General Information'],
      [s2,  'Recipient Selected'],
      [s3,  'Items Added'],
      [all, 'Ready to Save'],
    ].forEach(([ok, text]) => card.appendChild(_lsCheckRow(text, ok)));
    return card;
  }

  function _lsAutosaveCard() {
    const map = {
      saved:   { icon: '✓', text: 'All changes saved',        cls: 'ok'     },
      saving:  { icon: '…', text: 'Saving…',                  cls: 'saving' },
      unsaved: { icon: '●', text: 'Unsaved changes',          cls: 'warn'   },
      error:   { icon: '✕', text: 'Save failed — will retry', cls: 'error'  },
    };
    const s = map[_autosaveStatus] || map.saved;
    const card = document.createElement('div');
    card.className = 'inspector-card ls-autosave-card';
    const row = document.createElement('div');
    row.className = `ls-autosave ls-autosave--${s.cls}`;
    const iconEl = document.createElement('span');
    iconEl.className = 'ls-autosave-icon';
    iconEl.textContent = s.icon;
    const textEl = document.createElement('span');
    textEl.className = 'ls-autosave-text';
    textEl.textContent = s.text;
    row.appendChild(iconEl);
    row.appendChild(textEl);
    card.appendChild(row);
    return card;
  }

  // ── Step-specific primary content ────────────────────────────

  function _lsStep1Card() {
    const fd = _state.formData;
    const card = document.createElement('div');
    card.className = 'inspector-card';
    card.appendChild(_lsSectionLabel('General Information'));
    [
      ['ICS Number',   fd.icsNumber   || null],
      ['Date Issued',  fd.dateIssued  ? Utils.formatDate(fd.dateIssued)  : null],
      ['Fund Cluster', fd.fundCluster || null],
      ['Entity',       fd.entityName  || null],
      ['Issued By',    fd.issuedBy    || null],
    ].forEach(([key, val]) => card.appendChild(_lsRow(key, val || 'Not specified', !val)));
    return card;
  }

  function _lsStep2Card() {
    const fd = _state.formData;
    const frag = document.createDocumentFragment();

    const recCard = document.createElement('div');
    recCard.className = 'inspector-card';
    recCard.appendChild(_lsSectionLabel('Recipient'));
    [
      ['Name',     fd.receivedBy      || null],
      ['Position', fd.position        || null],
      ['Office',   fd.office          || null],
      ['Contact',  fd.receivedContact || null],
      ['Date',     fd.receivedDate ? Utils.formatDate(fd.receivedDate) : null],
    ].forEach(([k, v]) => recCard.appendChild(_lsRow(k, v || 'Not specified', !v)));
    frag.appendChild(recCard);

    const docCard = document.createElement('div');
    docCard.className = 'inspector-card';
    docCard.appendChild(_lsSectionLabel('Document'));
    [
      ['ICS Number',  fd.icsNumber  || null],
      ['Date Issued', fd.dateIssued ? Utils.formatDate(fd.dateIssued) : null],
    ].forEach(([k, v]) => docCard.appendChild(_lsRow(k, v || 'Not specified', !v)));
    frag.appendChild(docCard);

    return frag;
  }

  function _lsStep3Card() {
    const fd = _state.formData;
    const items = fd.items;
    const totalCost = items.reduce((s, i) => s + (parseFloat(i.totalCost) || 0), 0);
    const totalQty  = items.reduce((s, i) => s + (parseFloat(i.quantity)  || 0), 0);
    const eulNums   = items.map(i => parseFloat(i.estimatedUsefulLife) || 0).filter(n => n > 0);
    const avgEUL    = eulNums.length
      ? (eulNums.reduce((s, n) => s + n, 0) / eulNums.length).toFixed(1) + ' yrs'
      : '—';

    const frag = document.createDocumentFragment();

    // Snapshot
    const docCard = document.createElement('div');
    docCard.className = 'inspector-card';
    docCard.appendChild(_lsSectionLabel('Document'));
    [
      ['Recipient',  fd.receivedBy || null],
      ['ICS Number', fd.icsNumber  || null],
    ].forEach(([k, v]) => docCard.appendChild(_lsRow(k, v || 'Not specified', !v)));
    frag.appendChild(docCard);

    // Inventory totals
    const totCard = document.createElement('div');
    totCard.className = 'inspector-card';
    totCard.appendChild(_lsSectionLabel('Inventory Totals'));
    [
      ['Items Added', String(items.length)],
      ['Total Qty',   String(totalQty)],
      ['Total Value', Utils.formatCurrency(totalCost)],
      ['Avg. EUL',    avgEUL],
    ].forEach(([k, v]) => totCard.appendChild(_lsRow(k, v)));
    frag.appendChild(totCard);

    // Item checklist
    if (items.length > 0) {
      const listCard = document.createElement('div');
      listCard.className = 'inspector-card';
      listCard.appendChild(_lsSectionLabel('Item Checklist'));
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'ls-item-row';
        const checkEl = document.createElement('span');
        checkEl.className = 'ls-item-check';
        checkEl.textContent = '✓';
        const nameEl = document.createElement('span');
        nameEl.className = 'ls-item-name';
        nameEl.textContent = item.description || '(unnamed)';
        const costEl = document.createElement('span');
        costEl.className = 'ls-item-cost';
        costEl.textContent = Utils.formatCurrency(item.totalCost);
        row.appendChild(checkEl);
        row.appendChild(nameEl);
        row.appendChild(costEl);
        listCard.appendChild(row);
      });
      frag.appendChild(listCard);
    }

    return frag;
  }

  function _lsStep4Card() {
    const fd = _state.formData;
    const totalCost = fd.items.reduce((s, i) => s + (parseFloat(i.totalCost) || 0), 0);
    const s1  = !!(fd.icsNumber && fd.dateIssued && fd.issuedBy);
    const s2  = !!(fd.receivedBy && fd.receivedDate);
    const s3  = fd.items.length > 0;
    const all = s1 && s2 && s3;

    const frag = document.createDocumentFragment();

    const summaryCard = document.createElement('div');
    summaryCard.className = 'inspector-card';
    summaryCard.appendChild(_lsSectionLabel('Document Summary'));
    [
      ['Recipient',    fd.receivedBy  || null],
      ['ICS Number',   fd.icsNumber   || null],
      ['Fund Cluster', fd.fundCluster || null],
      ['Items',        String(fd.items.length)],
      ['Total Value',  Utils.formatCurrency(totalCost)],
    ].forEach(([k, v]) => {
      const missing = v === null || v === undefined;
      summaryCard.appendChild(_lsRow(k, missing ? 'Not specified' : v, missing));
    });

    const badge = document.createElement('div');
    badge.className = `ls-status-badge ${all ? 'ready' : 'incomplete'}`;
    badge.textContent = all ? '✓ Ready to Save' : '⚠ Incomplete';
    summaryCard.appendChild(badge);
    frag.appendChild(summaryCard);

    return frag;
  }

  // ── Main render ──────────────────────────────────────────

  function _renderContextPanel() {
    if (!_contextBody) return;
    _contextBody.innerHTML = '';

    // Panel title (changes per step)
    const panelTitles = ['LIVE SUMMARY', 'RECIPIENT SUMMARY', 'CURRENT INVENTORY', 'READY TO SAVE'];
    const titleEl = document.createElement('p');
    titleEl.className = 'ls-panel-title';
    titleEl.textContent = panelTitles[_state.step - 1] || 'SUMMARY';
    _contextBody.appendChild(titleEl);

    // Step-specific primary content
    const stepFns = [_lsStep1Card, _lsStep2Card, _lsStep3Card, _lsStep4Card];
    const primary = stepFns[_state.step - 1]?.();
    if (primary) _contextBody.appendChild(primary);

    // Persistent cards — always present, content updates per step
    _contextBody.appendChild(_lsProgressCard());
    _contextBody.appendChild(_lsValidationCard());
    _contextBody.appendChild(_lsAutosaveCard());
  }

  function _lsCompletionState() {
    const fd = _state.formData;
    const generalReady = !!(fd.icsNumber && fd.dateIssued && fd.issuedBy);
    const recipientReady = !!(fd.receivedBy && fd.receivedDate);
    const itemsReady = fd.items.length > 0;
    return {
      generalReady,
      recipientReady,
      itemsReady,
      allReady: generalReady && recipientReady && itemsReady
    };
  }

  function _lsGuideConfig() {
    const fd = _state.formData;
    const items = fd.items || [];
    const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.totalCost) || 0), 0);
    const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

    return [
      {
        eyebrow: 'Step 1 of 4',
        title: 'Set up the document',
        desc: 'Establish the ICS identity and issuing details before moving into the recipient and inventory sections.',
        iconName: 'records',
        rows: [
          { key: 'ICS Number', value: fd.icsNumber || 'Not specified', empty: !fd.icsNumber },
          { key: 'Date Issued', value: fd.dateIssued ? Utils.formatDate(fd.dateIssued) : 'Not specified', empty: !fd.dateIssued },
          { key: 'Fund Cluster', value: fd.fundCluster || 'Not specified', empty: !fd.fundCluster },
          { key: 'Issued By', value: fd.issuedBy || 'Not specified', empty: !fd.issuedBy }
        ],
        filled: [
          fd.icsNumber ? 'ICS number entered' : '',
          fd.dateIssued ? 'Issue date captured' : '',
          fd.fundCluster ? 'Fund cluster selected' : '',
          fd.issuedBy ? 'Issuing officer named' : ''
        ].filter(Boolean),
        missing: [
          !fd.icsNumber ? 'ICS number is still empty.' : '',
          !fd.dateIssued ? 'Issue date has not been selected.' : '',
          !fd.issuedBy ? 'Issued by field is still blank.' : ''
        ].filter(Boolean)
      },
      {
        eyebrow: 'Step 2 of 4',
        title: 'Confirm the recipient',
        desc: 'Capture who receives the property and the accountability details that will appear on the slip.',
        iconName: 'user',
        rows: [
          { key: 'Recipient', value: fd.receivedBy || 'Not specified', empty: !fd.receivedBy },
          { key: 'Position', value: fd.position || 'Not specified', empty: !fd.position },
          { key: 'Office', value: fd.office || 'Not specified', empty: !fd.office },
          { key: 'Received Date', value: fd.receivedDate ? Utils.formatDate(fd.receivedDate) : 'Not specified', empty: !fd.receivedDate }
        ],
        filled: [
          fd.receivedBy ? 'Recipient selected' : '',
          fd.office ? 'Office supplied' : '',
          fd.receivedDate ? 'Receipt date ready' : ''
        ].filter(Boolean),
        missing: [
          !fd.receivedBy ? 'Recipient name still needs to be filled.' : '',
          !fd.receivedDate ? 'Received date is still missing.' : ''
        ].filter(Boolean)
      },
      {
        eyebrow: 'Step 3 of 4',
        title: 'Build the item list',
        desc: 'Add the accountable items, quantities, and values that make up this slip.',
        iconName: 'package',
        rows: [
          { key: 'Items Added', value: String(items.length) },
          { key: 'Total Quantity', value: String(totalQty) },
          { key: 'Total Value', value: Utils.formatCurrency(totalValue) },
          { key: 'Recipient', value: fd.receivedBy || 'Not specified', empty: !fd.receivedBy }
        ],
        filled: items.slice(0, 3).map(item => item.description || '(unnamed item)'),
        missing: items.length
          ? [`${Math.max(items.length - 3, 0)} more item(s) stay available in the main table.`].filter(text => !text.startsWith('0 '))
          : ['No items have been added yet.']
      },
      {
        eyebrow: 'Step 4 of 4',
        title: 'Review before saving',
        desc: 'Double-check the full slip, then save once the document, recipient, and item sections are all complete.',
        iconName: 'check',
        rows: [
          { key: 'Recipient', value: fd.receivedBy || 'Not specified', empty: !fd.receivedBy },
          { key: 'ICS Number', value: fd.icsNumber || 'Not specified', empty: !fd.icsNumber },
          { key: 'Items', value: String(items.length) },
          { key: 'Total Value', value: Utils.formatCurrency(totalValue) }
        ],
        filled: [
          fd.icsNumber ? 'Document details are present' : '',
          fd.receivedBy ? 'Recipient details are present' : '',
          items.length ? `${items.length} item(s) ready for final review` : ''
        ].filter(Boolean),
        missing: []
      }
    ][_state.step - 1];
  }

  function _lsBuildGuideCard() {
    const guide = _lsGuideConfig();
    const card = Components.contextLead({
      eyebrow: guide.eyebrow,
      title: guide.title,
      desc: guide.desc,
      iconName: guide.iconName,
      badge: `Step ${_state.step}`,
      tier: 'hero'
    });
    card.appendChild(Components.contextKeyValueList(guide.rows));
    return card;
  }

  function _lsBuildCompletionCard() {
    const guide = _lsGuideConfig();
    const card = Components.contextCard({
      title: 'What is Filled / Missing',
      iconName: 'info',
      subtitle: 'The panel keeps the current step concise so you can scan progress without losing readability.',
      tier: 'supporting'
    });

    const sections = [];
    if (guide.filled.length) {
      sections.push(...guide.filled.map(text => ({
        icon: Components.icon('check'),
        title: text,
        meta: 'Completed'
      })));
    }
    if (guide.missing.length) {
      sections.push(...guide.missing.map(text => ({
        icon: Components.icon('alert'),
        title: text,
        meta: 'Needs attention'
      })));
    }

    if (!sections.length) {
      sections.push({
        icon: Components.icon('check'),
        title: 'Everything needed for this step is in place.',
        meta: 'No blockers detected.'
      });
    }

    card.querySelector('.context-card-body').appendChild(
      Components.contextList(sections, { compact: true })
    );
    return card;
  }

  function _lsBuildStatusCard() {
    const completion = _lsCompletionState();
    const pct = Math.round((_state.step / _state.totalSteps) * 100);
    const statusText = _autosaveStatus === 'saving'
      ? 'Saving changes now'
      : (_autosaveStatus === 'error'
        ? 'Autosave needs attention'
        : (_autosaveStatus === 'unsaved' ? 'Changes not saved yet' : 'All changes saved'));

    const card = Components.contextCard({
      title: 'Progress & Save Status',
      iconName: 'clock',
      subtitle: completion.allReady ? 'This slip is ready for saving.' : 'Final blockers stay visible here as you move between steps.',
      tier: 'status'
    });
    const body = card.querySelector('.context-card-body');
    body.appendChild(Components.contextMetricGrid([
      { label: 'Progress', value: `${pct}%`, caption: `Step ${_state.step} of ${_state.totalSteps}` },
      { label: 'Autosave', value: statusText, caption: completion.allReady ? 'Ready to save' : 'Still checking required sections' }
    ]));
    body.appendChild(Components.contextKeyValueList([
      { key: 'General Info', value: completion.generalReady ? 'Ready' : 'Incomplete', emphasis: completion.generalReady ? 'success' : 'warning' },
      { key: 'Recipient', value: completion.recipientReady ? 'Ready' : 'Incomplete', emphasis: completion.recipientReady ? 'success' : 'warning' },
      { key: 'Items', value: completion.itemsReady ? 'Ready' : 'Incomplete', emphasis: completion.itemsReady ? 'success' : 'warning' },
      { key: 'Final Status', value: completion.allReady ? 'Ready to Save' : 'Blocked', emphasis: completion.allReady ? 'success' : 'warning' }
    ]));
    return card;
  }

  function _renderContextPanel() {
    if (!_contextBody) return;
    _contextBody.innerHTML = '';
    _contextBody.appendChild(_lsBuildGuideCard());
    _contextBody.appendChild(_lsBuildCompletionCard());
    _contextBody.appendChild(_lsBuildStatusCard());
  }

  /* ----------------------------------------------------------
     Keyboard Shortcuts Wires
     ---------------------------------------------------------- */
  function _setupKeyboardShortcuts() {
    document.addEventListener('keydown', _keyboardShortcutHandler);
  }

  // Same as before
  function _teardownKeyboardShortcuts() {
    document.removeEventListener('keydown', _keyboardShortcutHandler);
  }

  function _keyboardShortcutHandler(e) {
    if (AppState.currentPage !== '#new' && AppState.currentPage !== '#edit') return;

    // Esc -> Cancel drawer edit
    if (e.key === 'Escape') {
      if (_drawerEl && _drawerEl.classList.contains('open')) {
        e.preventDefault();
        _closeItemDrawer();
        return;
      }
      if (_undoBannerEl && _undoBannerEl.classList.contains('visible')) {
        _hideUndoBanner();
      }
    }

    // Enter inside Drawer -> Save Item
    if (e.key === 'Enter' && _drawerEl && _drawerEl.classList.contains('open')) {
      const focused = document.activeElement;
      if (focused && (focused.id === 'drawer-item-desc' || focused.tagName === 'INPUT' || focused.tagName === 'SELECT')) {
        const dropdown = _drawerEl.querySelector('#desc-suggestions-list');
        if (dropdown && dropdown.classList.contains('active')) {
          return; // Allow autocomplete selection first
        }
        e.preventDefault();
        _saveDrawerItem();
      }
    }

    // Ctrl+Shift+A -> Add Item (Step 3 only)
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'A') {
      if (_state.step === 3) {
        e.preventDefault();
        _openItemDrawer(null, -1);
      }
    }

    // Ctrl+S -> Save Draft
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      _manualSaveDraft();
    }
  }

  async function _manualSaveDraft() {
    _collectFormData();
    _setAutosaveStatus('saving');
    try {
      const data = { ..._state.formData, status: 'draft' };
      if (_state.draftId) {
        await RecordService.updateRecord(_state.draftId, data);
      } else {
        const draft = await RecordService.createRecord(data);
        _state.draftId = draft.id;
      }
      _state.isDirty = false;
      _setAutosaveStatus('saved');
      UIKit.toast('Draft saved manually.', 'success');
    } catch (err) {
      console.error('[NewICSPage] Manual save draft error', err);
      _setAutosaveStatus('error');
      UIKit.toast('Failed to save draft.', 'error');
    }
  }

  /* ----------------------------------------------------------
     Main Render
     ---------------------------------------------------------- */
  async function render(workspace, contextBody) {
    workspace.innerHTML = '';
    _contextBody = contextBody;

    // Load edit/draft state
    _state.isEditMode   = !!AppState.editRecordId;
    _state.editRecordId = AppState.editRecordId || null;
    AppState.editRecordId = null; // consume

    const pageTitle = _state.isEditMode ? 'Edit ICS Record' : 'New ICS Record';
    const pageSubtitle = _state.isEditMode
      ? 'Update the details and items of the Inventory Custodian Slip'
      : 'Create a new guided Inventory Custodian Slip';

    // Populate data if edit mode
    if (_state.isEditMode && _state.editRecordId) {
      try {
        const rec = await RecordService.getRecord(_state.editRecordId);
        if (rec) {
          _state.formData = {
            icsNumber:    rec.icsNumber,
            entityName:   rec.entityName,
            fundCluster:  rec.fundCluster,
            dateIssued:   rec.dateIssued,
            issuedBy:     rec.issuedBy,
            remarks:      rec.remarks,
            receivedBy:   rec.receivedBy,
            position:     rec.position,
            office:       rec.office,
            receivedDate: rec.receivedDate || rec.dateIssued || Utils.today(),
            receivedContact: rec.receivedContact || '',
            recipientRemarks: rec.recipientRemarks || '',
            items:        rec.items.map(i => ({ ...i })),
          };
          _state.draftId = rec.id;
        }
      } catch (err) {
        console.error('[NewICSPage] Edit load error', err);
        UIKit.toast('Could not load record details.', 'error');
      }
    } else {
      // Pre-populate defaults from SettingsManager
      const s = SettingsManager.get();
      _state.formData.entityName = s.entityName || '';
      _state.formData.fundCluster = s.fundCluster || '';
      _state.formData.issuedBy = s.propertyCustodian || '';
    }

    // ── Page Header ──
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <div>
        <h1 class="page-title">${pageTitle}</h1>
        <p class="page-subtitle">${pageSubtitle}</p>
      </div>
    `;
    workspace.appendChild(header);

    // ── Sticky Wizard & Cancel Bar ──
    const stickyBar = document.createElement('div');
    stickyBar.className = 'wizard-sticky-bar';

    // Add cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost btn-sm';
    cancelBtn.id = 'form-cancel-btn';
    cancelBtn.style.color = 'var(--color-text-secondary)';
    cancelBtn.style.flexShrink = '0';
    cancelBtn.style.paddingLeft = '0';
    cancelBtn.innerHTML = `${Components.icon('close')} Cancel`;
    stickyBar.appendChild(cancelBtn);

    // Add horizontal step progress navigator
    const wizardNav = document.createElement('nav');
    wizardNav.className = 'wizard-progress-nav';
    wizardNav.id = 'wizard-progress-nav';
    wizardNav.setAttribute('aria-label', 'Form progress');
    stickyBar.appendChild(wizardNav);

    workspace.appendChild(stickyBar);

    // ── Form Card (full-width, single column) ──
    const formCard = document.createElement('div');
    formCard.className = 'form-card';
    _formEl = formCard;

    // Autosave bar (no card header/title — navigator already communicates step)
    const autosaveBar = document.createElement('div');
    autosaveBar.className = 'autosave-bar saved';
    autosaveBar.innerHTML = `<span class="save-dot"></span><span>All changes saved</span>`;
    _autosaveBarEl = autosaveBar;
    formCard.appendChild(autosaveBar);

    // Step body
    const stepBody = document.createElement('div');
    stepBody.className = 'form-card-body';
    stepBody.id = 'form-step-body';
    formCard.appendChild(stepBody);

    // Form footer
    const footer = document.createElement('div');
    footer.className = 'form-card-footer';
    footer.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="form-prev-btn" disabled>
        ${Components.icon('chevronLeft')} Previous
      </button>
      <div class="flex gap-3">
        <button class="btn btn-secondary btn-sm" id="form-draft-btn" type="button">
          ${Components.icon('list')} Save Draft
        </button>
        <button class="btn btn-primary" id="form-next-btn">
          Next Step ${Components.icon('chevronRight')}
        </button>
        <button class="btn btn-primary" id="form-save-btn" style="display:none">
          ${Components.icon('check')} Save ICS
        </button>
      </div>
    `;
    formCard.appendChild(footer);
    workspace.appendChild(formCard);

    // ── Wire Events ──
    document.getElementById('form-prev-btn').addEventListener('click', _prevStep);
    document.getElementById('form-next-btn').addEventListener('click', _nextStep);
    document.getElementById('form-save-btn').addEventListener('click', _saveRecord);
    document.getElementById('form-draft-btn').addEventListener('click', _manualSaveDraft);

    document.getElementById('form-cancel-btn').addEventListener('click', async () => {
      if (_state.isDirty) {
        const confirmed = await UIKit.confirm({
          title: 'Discard Changes?',
          message: 'Leave the form? Any unsaved changes will be lost.',
          confirmText: 'Discard',
          cancelText: 'Keep Editing',
          variant: 'warning',
        });
        if (!confirmed) return;
      }
      _cleanup();
      Router.navigate('#records');
    });

    // ── Initial Render ──
    _renderStepNav();
    _renderStepContent();
    _updateStepNav();
    _renderContextPanel();

    // Start auto-save, protection, keyboard shortcuts
    _startAutoSave();
    _enableNavProtection();
    _setupKeyboardShortcuts();

    workspace.classList.add('page-enter');
    setTimeout(() => workspace.classList.remove('page-enter'), 300);
  }

  function destroy() {
    _cleanup();
    _teardownKeyboardShortcuts();
  }

  return { render, destroy };
})();
