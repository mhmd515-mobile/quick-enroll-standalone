// js/quick-enroll.js
// 3-Step PC Asset Registration Controller (Standalone Version)

document.addEventListener('DOMContentLoaded', async () => {
  const client = window.db?.supabaseClient;
  if (!client) {
    console.error('Supabase client not initialized');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);

  // DOM Elements
  const form = document.getElementById('quick-enroll-form');
  const statusMsg = document.getElementById('form-status');
  const itIdInput = document.getElementById('it-id');
  const genItIdBtn = document.getElementById('gen-it-id-btn');
  const categorySelect = document.getElementById('category-select');
  const subcategorySelect = document.getElementById('subcategory-select');
  const locationSelect = document.getElementById('location-select');
  const statusSelect = document.getElementById('status-select');
  const assignedToInput = document.getElementById('assigned-to');
  const storIdInput = document.getElementById('stor-id');
  const notesInput = document.getElementById('asset-notes');
  // ─── Accessories State & Logic (Exact match with add-asset.js) ─────────────
  let accessoriesList = [];
  const accIsAssetCheckbox = document.getElementById('acc-is-asset');
  const accAssetSelectGroup = document.getElementById('acc-asset-select-group');
  const accNameInputGroup = document.getElementById('acc-name-input-group');
  const addAccessoryBtn = document.getElementById('add-accessory-btn');
  const accItIdInput = document.getElementById('acc-it-id');
  const accNameInput = document.getElementById('acc-name-input');
  const accessoriesTbody = document.getElementById('accessories-tbody');

  if (accIsAssetCheckbox) {
    accIsAssetCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        accAssetSelectGroup?.classList.remove('hidden');
        accNameInputGroup?.classList.add('hidden');
      } else {
        accAssetSelectGroup?.classList.add('hidden');
        accNameInputGroup?.classList.remove('hidden');
      }
    });
  }

  function renderAccessoriesTable() {
    if (!accessoriesTbody) return;
    if (accessoriesList.length === 0) {
      accessoriesTbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center py-4 text-xs text-ink-300">لا توجد ملحقات مسجلة حالياً لهذا الأصل.</td>
        </tr>`;
      return;
    }

    accessoriesTbody.innerHTML = '';
    accessoriesList.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-edge/40 last:border-0';
      const typeLabel = item.is_asset
        ? '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-ok/20 text-ok border border-ok/30">أصل مسجل</span>'
        : '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-layer-3 text-ink-300 border border-edge">ملحق نصي</span>';

      tr.innerHTML = `
        <td class="p-2.5 font-semibold text-ink-100">${item.name}</td>
        <td class="p-2.5">${typeLabel}</td>
        <td class="p-2.5 text-center">
          <button type="button" class="text-bad hover:bg-bad/20 p-1 rounded-lg transition-colors cursor-pointer" onclick="window.removeAccessory(${idx})" title="حذف">
            <span class="material-symbols-rounded text-base">delete</span>
          </button>
        </td>
      `;
      accessoriesTbody.appendChild(tr);
    });
  }

  window.removeAccessory = (index) => {
    accessoriesList.splice(index, 1);
    renderAccessoriesTable();
  };

  if (addAccessoryBtn) {
    addAccessoryBtn.addEventListener('click', async () => {
      const isAsset = accIsAssetCheckbox ? accIsAssetCheckbox.checked : false;
      let newItem = null;

      if (isAsset) {
        const itIdValue = accItIdInput ? accItIdInput.value.trim() : '';
        if (!itIdValue) {
          alert('الرجاء إدخال كود IT للأصل');
          return;
        }

        if (itIdInput && itIdValue.toLowerCase() === itIdInput.value.trim().toLowerCase()) {
          alert('لا يمكن إضافة الأصل كملحق لنفسه');
          return;
        }

        addAccessoryBtn.disabled = true;
        const originalText = addAccessoryBtn.innerHTML;
        addAccessoryBtn.innerHTML = '<span class="material-symbols-rounded animate-spin text-sm">autorenew</span> جاري التحقق...';

        try {
          const { data: asset, error } = await client
            .from('assets')
            .select(`
              id,
              it_id,
              sub_Categories ( name )
            `)
            .eq('it_id', itIdValue)
            .maybeSingle();

          if (error || !asset) {
            alert('كود IT المدخل غير موجود في النظام');
            return;
          }

          if (accessoriesList.some(item => item.is_asset && item.slave_asset_id === asset.id)) {
            alert('هذا الملحق مضاف بالفعل');
            return;
          }

          newItem = {
            is_asset: true,
            slave_asset_id: asset.id,
            name: `${asset.it_id} - ${asset.sub_Categories?.name || ''}`,
          };
        } catch (err) {
          console.error(err);
          alert('حدث خطأ أثناء التحقق من كود IT');
          return;
        } finally {
          addAccessoryBtn.disabled = false;
          addAccessoryBtn.innerHTML = originalText;
        }
      } else {
        const nameValue = accNameInput ? accNameInput.value.trim() : '';
        if (!nameValue) {
          alert('الرجاء إدخال اسم الملحق');
          return;
        }
        newItem = {
          is_asset: false,
          slave_asset_id: null,
          name: nameValue,
        };
      }

      if (newItem) {
        accessoriesList.push(newItem);
        if (accItIdInput) accItIdInput.value = '';
        if (accNameInput) accNameInput.value = '';
        renderAccessoriesTable();
      }
    });
  }

  // Step 2 Elements (Import Data Button & Preview)
  const importDataBtn = document.getElementById('import-data-btn');
  const specsEmpty = document.getElementById('imported-specs-empty');
  const specsGrid = document.getElementById('imported-specs-grid');
  const specComp = document.getElementById('spec-computer-name');
  const specSerial = document.getElementById('spec-serial');
  const specOs = document.getElementById('spec-os');
  const specCpu = document.getElementById('spec-cpu');
  const specRam = document.getElementById('spec-ram');
  const specIp = document.getElementById('spec-ip');
  const specDisks = document.getElementById('spec-disks');
  const specMb = document.getElementById('spec-motherboard');

  // Step 3 Element (Insert Button)
  const submitBtn = document.getElementById('submit-btn');

  // Hardware Specs State
  let importedHardware = null;

  const dynamicContainer = document.getElementById('dynamic-fields-container');
  const dynamicGrid = document.getElementById('dynamic-fields-grid');

  // 1. Initial Load: Auto-import hardware specs FIRST if scan parameters exist in URL
  if (urlParams.get('serial') || urlParams.get('scanId') || urlParams.get('computer')) {
    await performImportData();
  }

  // Populate Mandatory Dropdowns & IT ID
  await loadDropdowns();
  await autoGenerateItId();

  // Category Change Listener to load Subcategories
  if (categorySelect) {
    categorySelect.addEventListener('change', async () => {
      const catId = categorySelect.value;
      if (!catId) {
        if (subcategorySelect) {
          subcategorySelect.innerHTML = '<option value="">اختر الفئة الأساسية أولاً...</option>';
          subcategorySelect.disabled = true;
        }
        if (dynamicContainer) dynamicContainer.classList.add('hidden');
        if (dynamicGrid) dynamicGrid.innerHTML = '';
        return;
      }
      await loadSubcategories(catId);
    });
  }

  // Subcategory Change Listener to load & pre-fill custom dynamic fields
  if (subcategorySelect) {
    subcategorySelect.addEventListener('change', async () => {
      const subId = subcategorySelect.value;
      if (!subId) {
        if (dynamicContainer) dynamicContainer.classList.add('hidden');
        if (dynamicGrid) dynamicGrid.innerHTML = '';
        return;
      }
      await loadDynamicFields(subId);
    });
  }

  // Script selection/download buttons listener to auto-select Main Category & Subcategory
  document.querySelectorAll('[data-script-type]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const scriptType = btn.dataset.scriptType;
      if (scriptType) {
        await autoSelectCategoryAndSubcategory(scriptType);
      }
    });
  });

  // ─── STEP 1: Load Dropdowns & Auto IT ID ──────────────────────────────────
  async function loadDropdowns() {
    try {
      // Main Categories
      const { data: cats, error: catErr } = await client.from('Categories').select('id, name').order('name');
      if (catErr) console.error('Error loading Categories:', catErr);

      if (categorySelect) {
        categorySelect.innerHTML = '<option value="">اختر الفئة الأساسية...</option>' +
          (cats || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }

      // Locations
      const { data: locs } = await client.from('locations').select('id, name').order('name');
      if (locationSelect) {
        locationSelect.innerHTML = '<option value="">اختر موقع الأصل (المبنى/الغرفة)...</option>' +
          (locs || []).map(l => `<option value="${l.id}">${l.name}</option>`).join('');
      }

      // Populate System Assets for Accessories Dropdown
      await loadSystemAssetsForAccessories();
      const { data: stats } = await client.from('asset_statuses').select('id, name').order('id');
      if (statusSelect) {
        statusSelect.innerHTML = '<option value="">اختر حالة الأصل...</option>' +
          (stats || []).map(st => `<option value="${st.id}">${st.name}</option>`).join('');

        if (stats && stats.length > 0) {
          const activeOpt = stats.find(st => st.name.includes('نشط') || st.name.includes('متاح') || st.name.toLowerCase().includes('active'));
          statusSelect.value = activeOpt ? activeOpt.id : stats[0].id;
        }
      }

      // Auto-select Category & Subcategory if device type is specified in URL parameter or script
      const typeParam = (urlParams.get('type') || urlParams.get('subcategory') || urlParams.get('script') || '').toLowerCase().trim();
      if (typeParam) {
        await autoSelectCategoryAndSubcategory(typeParam);
      }
    } catch (err) {
      console.error('Error loading dropdown options:', err);
    }
  }

  async function loadSystemAssetsForAccessories() {
    if (!systemAssetAccSelect) return;
    try {
      systemAssetAccSelect.innerHTML = '<option value="">جاري تحميل الأصول المتاحة...</option>';
      const { data: assets, error } = await client
        .from('assets')
        .select('id, it_id, Serial_number, sub_Categories(name)')
        .order('it_id', { ascending: true })
        .limit(500);

      if (error) throw error;

      if (!assets || assets.length === 0) {
        systemAssetAccSelect.innerHTML = '<option value="">لا توجد أصول أخرى مسجلة في المنظومة حالياً</option>';
        return;
      }

      systemAssetAccSelect.innerHTML = '<option value="">اختر أصلاً مسجلاً لإضافته كـ ملحق (شاشة، طابعة، ملحق آخر)...</option>' +
        assets.map(a => {
          const subName = a.sub_Categories?.name || 'أصل';
          const sn = a.Serial_number ? ` (S/N: ${a.Serial_number})` : '';
          return `<option value="${a.id}" data-it="${a.it_id}" data-sub="${subName}" data-sn="${a.Serial_number || ''}">${a.it_id} - ${subName}${sn}</option>`;
        }).join('');
    } catch (err) {
      console.error('Error loading system assets for accessories:', err);
      systemAssetAccSelect.innerHTML = '<option value="">تعذر تحميل الأصول من المنظومة</option>';
    }
  }

  // ─── Auto-select Main Category ("حاسبات") and Subcategory (Laptop, All in One, PC Case, PC Server) ───
  async function autoSelectCategoryAndSubcategory(typeParam) {
    if (!typeParam || !categorySelect) return;
    const cleanType = String(typeParam).toLowerCase().trim();

    // 1. Find Computer Main Category (Category 4 or name containing "حاسب", "حاسوب", "computer", "pc")
    const computerCatOpt = Array.from(categorySelect.options).find(opt => {
      const txt = opt.textContent.toLowerCase().trim();
      return opt.value === '4' || 
             txt.includes('حاسب') || 
             txt.includes('حاسوب') || 
             txt.includes('computer') || 
             txt === 'pc';
    });

    if (computerCatOpt) {
      categorySelect.value = computerCatOpt.value;
      await loadSubcategories(computerCatOpt.value);

      if (subcategorySelect) {
        let matchedSubId = null;

        // Keyword mapping for subcategories in both Arabic and English
        let keywords = [];
        if (cleanType.includes('laptop') || cleanType.includes('لابتوب') || cleanType.includes('محمول') || cleanType.includes('لاب')) {
          keywords = ['laptop', 'لابتوب', 'لاب توب', 'محمول'];
        } else if (cleanType.includes('all') || cleanType.includes('آل') || cleanType.includes('شامل')) {
          keywords = ['all in one', 'all-in-one', 'آل ان ون', 'الكل في واحد'];
        } else if (cleanType.includes('case') || cleanType.includes('desktop') || cleanType.includes('كيس') || cleanType.includes('مكتبي')) {
          keywords = ['pc case', 'case', 'desktop', 'كيسة', 'كيسه', 'مكتبي', 'حاسب مكتبي'];
        } else if (cleanType.includes('server') || cleanType.includes('سيرفر') || cleanType.includes('خادم')) {
          keywords = ['pc server', 'server', 'سيرفر', 'خادم'];
        }

        if (keywords.length > 0) {
          matchedSubId = Array.from(subcategorySelect.options).find(o => {
            const optTxt = o.textContent.toLowerCase().trim();
            return keywords.some(kw => optTxt.includes(kw));
          })?.value;
        }

        if (!matchedSubId) {
          matchedSubId = Array.from(subcategorySelect.options).find(o => {
            const optTxt = o.textContent.toLowerCase().trim();
            return optTxt.includes(cleanType) || cleanType.includes(optTxt);
          })?.value;
        }

        if (matchedSubId) {
          subcategorySelect.value = matchedSubId;
          await loadDynamicFields(matchedSubId);
        }
      }
    }
  }

  async function loadSubcategories(categoryId) {
    if (!subcategorySelect) return;
    subcategorySelect.innerHTML = '<option value="">جاري التحميل...</option>';
    subcategorySelect.disabled = true;

    try {
      const { data: subs, error: subErr } = await client
        .from('sub_Categories')
        .select('id, name')
        .eq('category_id', categoryId)
        .order('name');

      if (subErr) throw subErr;

      subcategorySelect.innerHTML = '<option value="">اختر الفئة الفرعية للأصل...</option>' +
        (subs || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      subcategorySelect.disabled = false;
    } catch (err) {
      console.error('Error loading subcategories:', err);
      subcategorySelect.innerHTML = '<option value="">خطأ في تحميل الفئات الفرعية</option>';
      subcategorySelect.disabled = false;
    }
  }

  // ─── Load Custom Dynamic Fields for Subcategory & Auto-Fill Specs ─────────
  async function loadDynamicFields(subcategoryId) {
    const dynamicContainer = document.getElementById('dynamic-fields-container');
    const dynamicGrid = document.getElementById('dynamic-fields-grid');
    if (!dynamicGrid || !dynamicContainer) return;
    dynamicGrid.innerHTML = '';
    dynamicContainer.classList.add('hidden');

    try {
      const { data: fields, error } = await client
        .from('field_definitions')
        .select('id, field_name, field_type, is_required, default_value')
        .eq('subcategory_id', subcategoryId)
        .order('display_order', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      if (!fields || fields.length === 0) return;

      dynamicContainer.classList.remove('hidden');

      fields.forEach(field => {
        const fieldId = `dynamic-field-${field.id}`;
        const isReq = field.is_required;
        const matchedVal = String(getMatchedValueForField(field.field_name) ?? '');

        const cell = document.createElement('div');

        const label = document.createElement('label');
        label.htmlFor = fieldId;
        label.className = 'block text-xs font-semibold text-ink-200 mb-1 flex items-center justify-between';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = field.field_name + (isReq ? ' *' : '');
        label.appendChild(nameSpan);

        if (matchedVal) {
          const autoTag = document.createElement('span');
          autoTag.className = 'text-[10px] text-ok font-bold';
          autoTag.textContent = '✔ معبأ تلقائياً من الفحص';
          label.appendChild(autoTag);
        }

        cell.appendChild(label);

        let inputEl;
        if (field.field_type === 'textarea') {
          inputEl = document.createElement('textarea');
          inputEl.id = fieldId;
          inputEl.dataset.fieldId = field.id;
          inputEl.rows = 2;
          inputEl.className = 'form-textarea w-full text-xs bg-layer-3 border-edge rounded-xl text-ink-100 p-2.5 focus:border-brand';
          if (isReq) inputEl.required = true;
          inputEl.value = matchedVal;

        } else if (field.field_type === 'select') {
          inputEl = document.createElement('select');
          inputEl.id = fieldId;
          inputEl.dataset.fieldId = field.id;
          inputEl.className = 'form-select w-full text-xs bg-layer-3 border-edge rounded-xl text-ink-100 p-2.5 focus:border-brand';
          if (isReq) inputEl.required = true;

          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'اختر...';
          inputEl.appendChild(placeholder);

          const optList = field.default_value
            ? field.default_value.split(',').map(s => s.trim()).filter(s => s)
            : [];
          const matchedLower = matchedVal.toLowerCase().trim();
          optList.forEach(opt => {
            const optEl = document.createElement('option');
            optEl.value = opt;
            optEl.textContent = opt;
            const optLower = opt.toLowerCase().trim();
            if (matchedLower && (
              optLower === matchedLower ||
              matchedLower.includes(optLower) ||
              optLower.includes(matchedLower)
            )) {
              optEl.selected = true;
            }
            inputEl.appendChild(optEl);
          });

        } else {
          inputEl = document.createElement('input');
          inputEl.id = fieldId;
          inputEl.dataset.fieldId = field.id;
          inputEl.type = field.field_type === 'number' ? 'number' : 'text';
          inputEl.className = 'form-input w-full text-xs bg-layer-3 border-edge rounded-xl text-ink-100 p-2.5 focus:border-brand font-mono';
          if (isReq) inputEl.required = true;
          inputEl.value = matchedVal;
        }

        cell.appendChild(inputEl);
        dynamicGrid.appendChild(cell);
      });

    } catch (err) {
      console.error('Error loading dynamic fields for subcategory:', err);
    }
  }

  function normalizeAr(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .trim();
  }

  function getMatchedValueForField(fieldName) {
    if (!importedHardware) return '';
    const fn = normalizeAr(fieldName);
    const has = (...words) => words.some(w => fn.includes(normalizeAr(w)));
    return _matchField(fn, has);
  }

  function _matchField(fn, has) {
    if (has('number of ram', 'number of memory') || (has('number', 'عدد') && has('ram', 'memory', 'ذاكرة'))) {
      return String(importedHardware.ram_count ?? 1);
    }
    if (fn === 'vram' || has('vram', 'video ram', 'gpu ram', 'في رام', 'ذاكرة كرت')) {
      return importedHardware.vram_mb || '';
    }
    if (has('ram type', 'memory type') || (has('type') && has('ram', 'memory', 'ذاكرة', 'رام'))) {
      return importedHardware.ram_type || 'DDR4';
    }
    if (has('storage') && has('type')) {
      return importedHardware.disk_type || '';
    }
    if ((has('نوع') && has('تخزين', 'قرص', 'هارد', 'disk', 'ssd', 'hdd')) || has('disk type')) {
      return importedHardware.disk_type || '';
    }
    if (has('gpu name') || has('gpu') && has('name')) {
      return importedHardware.gpu || '';
    }
    if (fn === 'gpu' || (has('gpu', 'graphics', 'شاشة', 'كرت') && !has('vram', 'ram', 'name'))) {
      return importedHardware.gpu || '';
    }
    if (has('ram', 'ذاكرة', 'memory') && !has('type', 'number of', 'vram', 'gpu', 'نوع', 'عدد', 'number')) {
      const gb = importedHardware.ram_gb;
      return (gb !== undefined && gb !== null && gb !== '') ? String(gb) : '';
    }
    if (has('cpu', 'processor', 'معالج')) {
      return importedHardware.cpu_info || '';
    }
    if (has('storage')) {
      const idxMatch = fn.match(/storage[-\s]?(\d+)/);
      const diskIdx = idxMatch ? parseInt(idxMatch[1]) - 1 : 0;
      const diskEntries = (importedHardware.disks || '').split('|').map(s => s.trim()).filter(s => s);
      const diskEntry = diskEntries[diskIdx];

      if (has('type')) {
        if (!diskEntry) return '';
        const typeMatch = diskEntry.match(/^(.+?)\s*-/);
        return typeMatch ? typeMatch[1].trim() : (importedHardware.disk_type || '');
      } else {
        if (!diskEntry) return '';
        const sizeMatch = diskEntry.match(/\((\d+)\s*GB\)/i);
        return sizeMatch ? sizeMatch[1] : '';
      }
    }
    if (has('هارد', 'قرص', 'أقراص', 'تخزين', 'disk', 'ssd', 'hdd', 'nvme') && !has('نوع', 'type')) {
      return importedHardware.disks || '';
    }
    if (has('motherboard', 'mother board', 'لوحة', 'board')) {
      return importedHardware.motherboard || '';
    }
    if (has('mac', 'فيزيائي', 'physical')) {
      return importedHardware.mac_address || '';
    }
    if (has('serial', 'سيريال', 'تسلسلي')) {
      return importedHardware.serial_number || '';
    }
    return '';
  }

  async function autoGenerateItId() {
    if (!itIdInput) return;
    try {
      const prefix = 'PC-';
      const { data: existing } = await client
        .from('assets')
        .select('it_id')
        .ilike('it_id', `${prefix}%`);

      let maxNum = 0;
      (existing || []).forEach(a => {
        if (a.it_id) {
          const num = parseInt(a.it_id.replace(prefix, ''));
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });

      maxNum++;
      itIdInput.value = `${prefix}${String(maxNum).padStart(3, '0')}`;
    } catch (err) {
      itIdInput.value = `PC-${Math.floor(100 + Math.random() * 900)}`;
    }
  }

  if (genItIdBtn) genItIdBtn.addEventListener('click', autoGenerateItId);

  // ─── STEP 2: Import Data ─────
  if (importDataBtn) {
    importDataBtn.addEventListener('click', performImportData);
  }

  async function performImportData() {
    let originalText = '';
    if (importDataBtn) {
      originalText = importDataBtn.innerHTML;
      importDataBtn.disabled = true;
      importDataBtn.innerHTML = '<span class="material-symbols-rounded animate-spin text-lg">progress_activity</span> جاري استيراد مواصفات الجهاز...';
    }

    try {
      const scanId = urlParams.get('scanId');
      const serial = urlParams.get('serial');
      const compName = urlParams.get('computer');

      let fetchedData = null;

      // Strict query: Only fetch scan if explicit serial, scanId, or computer name is provided in URL
      if (scanId || serial || compName) {
        let query = client.from('pc_hardware_scans').select('*');
        if (scanId) {
          query = query.eq('id', scanId);
        } else if (serial) {
          query = query.eq('serial_number', serial);
        } else if (compName) {
          query = query.eq('computer_name', compName);
        }

        const { data } = await query.order('last_scanned', { ascending: false }).limit(1).maybeSingle();
        if (data) fetchedData = data;
      }

      if (!fetchedData) {
        if (specsEmpty) specsEmpty.classList.add('hidden');
        if (specsGrid) specsGrid.classList.remove('hidden');

        if (serial && specSerial) {
          specSerial.value = serial;
        }

        const downloadLink = `<a href="sync-hardware.bat" download="sync-hardware.bat" type="application/octet-stream" class="underline font-bold text-white ml-1">تحميل سكربت الفحص (.bat)</a>`;
        if (serial) {
          showStatus(`⚠️ لم يتم العثور على سجل فحص للرقم التسلسلي (${serial}). يمكنك تعديل الخانات يدويًا أدناه أو ${downloadLink}.`, true);
        } else {
          showStatus(`⚠️ يمكنك كتابة وتعديل المواصفات يدويًا في الخانات أدناه أو ${downloadLink} لجلبه تلقائياً.`, true);
        }
        return;
      }

      importedHardware = fetchedData;

      if (subcategorySelect && subcategorySelect.value) {
        await loadDynamicFields(subcategorySelect.value);
      }

      const specGpu = document.getElementById('spec-gpu');
      const specMac = document.getElementById('spec-mac');
      const specRamType = document.getElementById('spec-ram-type');
      const specDiskType = document.getElementById('spec-disk-type');

      if (specSerial) specSerial.value = importedHardware.serial_number || '';
      if (specCpu) specCpu.value = importedHardware.cpu_info || '';
      if (specRam) specRam.value = importedHardware.ram_gb ? `${importedHardware.ram_gb}` : '';
      if (specRamType) specRamType.value = importedHardware.ram_type || 'DDR4';
      if (specDiskType) specDiskType.value = importedHardware.disk_type || 'SSD';
      if (specMac) specMac.value = importedHardware.mac_address || '';
      if (specGpu) specGpu.value = importedHardware.gpu || '';
      if (specDisks) specDisks.value = importedHardware.disks || '';
      if (specMb) specMb.value = importedHardware.motherboard || '';

      if (assignedToInput && !assignedToInput.value) {
        assignedToInput.value = importedHardware.computer_name || '';
      }

      // Attach event listeners on spec inputs so manual user edits sync to state & dynamic fields
      ['spec-serial', 'spec-cpu', 'spec-ram', 'spec-ram-type', 'spec-disk-type', 'spec-mac', 'spec-gpu', 'spec-disks', 'spec-motherboard'].forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl && !inputEl.dataset.hasListener) {
          inputEl.dataset.hasListener = 'true';
          inputEl.addEventListener('input', () => {
            if (!importedHardware) importedHardware = {};
            const sSerial = document.getElementById('spec-serial');
            const sCpu = document.getElementById('spec-cpu');
            const sRam = document.getElementById('spec-ram');
            const sRamType = document.getElementById('spec-ram-type');
            const sDiskType = document.getElementById('spec-disk-type');
            const sMac = document.getElementById('spec-mac');
            const sGpu = document.getElementById('spec-gpu');
            const sDisks = document.getElementById('spec-disks');
            const sMb = document.getElementById('spec-motherboard');

            if (sSerial) importedHardware.serial_number = sSerial.value.trim();
            if (sCpu) importedHardware.cpu_info = sCpu.value.trim();
            if (sRam) importedHardware.ram_gb = sRam.value.trim();
            if (sRamType) importedHardware.ram_type = sRamType.value.trim();
            if (sDiskType) importedHardware.disk_type = sDiskType.value.trim();
            if (sMac) importedHardware.mac_address = sMac.value.trim();
            if (sGpu) importedHardware.gpu = sGpu.value.trim();
            if (sDisks) importedHardware.disks = sDisks.value.trim();
            if (sMb) importedHardware.motherboard = sMb.value.trim();

            if (subcategorySelect && subcategorySelect.value) {
              loadDynamicFields(subcategorySelect.value);
            }
          });
        }
      });

      if (specsEmpty) specsEmpty.classList.add('hidden');
      if (specsGrid) specsGrid.classList.remove('hidden');

      showStatus('✔ تم جلب مواصفات الجهاز! يمكنك تعديل أي حقل ثم الضغط على زر "إدخال" لحفظ البيانات يدوياً.', false);

    } catch (err) {
      console.error('Error importing specs:', err);
      showStatus('تعذر استيراد البيانات تلقائياً: ' + (err.message || err), true);
    } finally {
      if (importDataBtn) {
        importDataBtn.disabled = false;
        if (importedHardware) {
          importDataBtn.innerHTML = '<span class="material-symbols-rounded text-lg">check_circle</span> تم عرض المواصفات (قابل للتعديل)';
        } else {
          importDataBtn.innerHTML = originalText;
        }
      }
    }
  }

  // ─── STEP 3: Save Asset Manually ──────────────
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideStatus();

      const itId = itIdInput?.value?.trim();
      const subcategoryId = subcategorySelect?.value;
      const locationId = locationSelect?.value;
      const statusId = statusSelect?.value;
      const assignedTo = assignedToInput?.value?.trim();
      const storId = storIdInput?.value?.trim() || null;

      if (!itId || !subcategoryId || !locationId || !statusId || !assignedTo) {
        showStatus('الرجاء تعبئة كافة المعلومات الإلزامية الأساسية في الخطوة (1) أولاً', true);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-rounded animate-spin text-lg">progress_activity</span> جاري الإدخال والحفظ...';

      try {
        const { data: existingAssets } = await client
          .from('assets')
          .select('id')
          .eq('it_id', itId);

        let targetAssetId = null;
        let isUpdate = false;

        const specSerialEl = document.getElementById('spec-serial');
        const finalSerial = specSerialEl?.value?.trim() || importedHardware?.serial_number || null;
        const notesVal = notesInput?.value?.trim() || null;

        const assetData = {
          it_id: itId,
          Serial_number: finalSerial,
          subcategory_id: parseInt(subcategoryId),
          location_id: parseInt(locationId),
          status_id: parseInt(statusId),
          assigned_to: assignedTo,
          stor_id: storId,
          notes: notesVal
        };

        if (existingAssets && existingAssets.length > 0) {
          targetAssetId = existingAssets[0].id;
          isUpdate = true;

          const { error: updateError } = await client
            .from('assets')
            .update(assetData)
            .eq('id', targetAssetId);

          if (updateError) throw updateError;
        } else {
          const { data: newAsset, error: insertError } = await client
            .from('assets')
            .insert(assetData)
            .select('id')
            .single();

          if (insertError) throw insertError;
          targetAssetId = newAsset?.id;
        }

        const dynamicInputs = dynamicGrid ? dynamicGrid.querySelectorAll('[data-field-id]') : [];
        if (dynamicInputs.length > 0 && targetAssetId) {
          if (isUpdate) {
            await client.from('asset_field_values').delete().eq('asset_id', targetAssetId);
          }

          const fieldValuesPayload = [];
          dynamicInputs.forEach(input => {
            const fieldId = parseInt(input.dataset.fieldId);
            const val = (input.value || '').trim();
            if (val !== '') {
              fieldValuesPayload.push({
                asset_id: targetAssetId,
                field_definition_id: fieldId,
                value: val
              });
            }
          });

          if (fieldValuesPayload.length > 0) {
            const { error: fvErr } = await client.from('asset_field_values').insert(fieldValuesPayload);
            if (fvErr) console.error('Error inserting asset_field_values:', fvErr);
          }
        }

        // Save accessories into asset_accessories table (exact match with add-asset.js)
        if (isUpdate && targetAssetId) {
          await client.from('asset_accessories').delete().eq('master_asset_id', targetAssetId);
        }

        if (accessoriesList.length > 0 && targetAssetId) {
          const accPayload = accessoriesList.map(a => ({
            master_asset_id: targetAssetId,
            is_asset: a.is_asset,
            slave_asset_id: a.is_asset ? a.slave_asset_id : null,
            name: a.is_asset ? null : a.name
          }));

          const { error: accErr } = await client
            .from('asset_accessories')
            .insert(accPayload);
          if (accErr) console.error('Error inserting asset_accessories:', accErr);
        }

        if (importedHardware?.id && targetAssetId) {
          await client
            .from('pc_hardware_scans')
            .update({ asset_id: targetAssetId, status: 'linked' })
            .eq('id', importedHardware.id);
        }

        showStatus(
          isUpdate
            ? `✔ تم تحديث بيانات الأصل (${itId}) وحفظ جميع المواصفات والملحقات في المنظومة بنجاح!`
            : `✔ تم إدخال وتأكيد الأصل (${itId}) والملحقات في المنظومة بنجاح!`,
          false
        );

        // Reset form for next device entry in standalone mode
        setTimeout(async () => {
          form.reset();
          accessoriesList = [];
          renderAccessoriesTable();
          if (notesInput) notesInput.value = '';
          if (accItIdInput) accItIdInput.value = '';
          if (accNameInput) accNameInput.value = '';
          if (specsEmpty) specsEmpty.classList.remove('hidden');
          if (specsGrid) specsGrid.classList.add('hidden');
          if (dynamicContainer) dynamicContainer.classList.add('hidden');
          if (dynamicGrid) dynamicGrid.innerHTML = '';
          importedHardware = null;
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span class="material-symbols-rounded text-xl">add_circle</span> إدخال وتأكيد الأصل في المنظومة';
          await autoGenerateItId();
        }, 2000);

      } catch (err) {
        console.error('Error inserting asset:', err);
        showStatus('حدث خطأ أثناء الإدخال: ' + (err.message || err), true);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-symbols-rounded text-xl">add_circle</span> إدخال وتأكيد الأصل في المنظومة';
      }
    });
  }

  function showStatus(msg, isError = false) {
    if (!statusMsg) return;
    statusMsg.classList.remove('hidden', 'bg-bad-dim', 'text-bad', 'bg-ok-dim', 'text-ok');
    if (isError) {
      statusMsg.classList.add('bg-bad-dim', 'text-bad');
    } else {
      statusMsg.classList.add('bg-ok-dim', 'text-ok');
    }
    statusMsg.innerHTML = msg;
    statusMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideStatus() {
    if (statusMsg) statusMsg.classList.add('hidden');
  }
});
