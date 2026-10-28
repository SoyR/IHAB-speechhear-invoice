const optionData = {
    center: [
        {
            id: "옵션1",
            label: "견적서 작성",
            title: "",
            cost: 0, basePrice: 0, discountPrice: 0,
            isCustom: true,
            desc: ""
        }
    ],
    hospital: [
        { id: "옵션1", title: "임상용 청능 재활 시스템 (기본형)", desc: "의료기기 연동용 PC 소프트웨어 라이선스 1년, 환자 데이터베이스 시스템, 임상 데이터 리포팅 툴, 사용자 매뉴얼" },
        { id: "옵션2", title: "임상용 청능 재활 시스템 (풀패키지)", desc: "의료기기 연동용 PC 소프트웨어 라이선스 1년, 환자용 터치 모니터 디스플레이 1대, 환자 데이터베이스 시스템, 의사용 모니터링 콘솔, 임상용 차트 연동 API 모듈" },
        { id: "옵션3", title: "원격 진료 및 홈 케어 처방 시스템", desc: "원격 처방 전용 플랫폼 라이선스 1년, 환자 홈 트레이닝 연동 계정 50개, 보안 데이터 서버 이용권 (의료법 기준 준수 암호화 시스템 포함)" },
        { id: "옵션4", title: "병원 시스템 통합(EMR/OCS) 연동 모듈", desc: "원내 의료정보시스템(EMR/OCS) 맞춤형 연동 커스터마이징 개발, 데이터 인터페이스(HL7/FHIR 연동) 구축, 원내 서버 설치 및 안정화 테스트, 유지보수 1년" }
    ]
};

let currentType = "";
let selectedOptions = [];
let currentEditingId = null;
let currentInvoiceNumber = null;
let applyDiscount = false;
let docType = 'quote';

const docTypeLabels = {
    quote: {
        name: '견적서',
        title: '말귀 견적서',
        recipient: '견적 수신처',
        number: '견적 번호:',
        date: '견적 일자:',
        formDate: '견적일자',
        total: '총 견적 금액 (합계)',
        defaultRemarks: '특이사항 없음. 본 견적서의 유효기간은 발행일로부터 30일입니다.'
    },
    statement: {
        name: '거래명세서',
        title: '말귀 거래명세서',
        recipient: '수신처',
        number: '번호:',
        date: '일자:',
        formDate: '일자',
        total: '총 금액 (합계)',
        defaultRemarks: '특이사항 없음.'
    }
};

function setDocType(type) {
    docType = docTypeLabels[type] ? type : 'quote';
    const labels = docTypeLabels[docType];
    document.querySelectorAll('input[name="docType"]').forEach(r => { r.checked = r.value === docType; });
    document.getElementById('labelDate').innerText = labels.formDate;
    document.getElementById('btnGenerate').innerText = `${labels.name} 최종 생성`;
}

function applyDocTypeToPreview() {
    const labels = docTypeLabels[docType];
    document.getElementById('invoicePreviewWrapper').classList.toggle('doc-statement', docType === 'statement');
    document.getElementById('doneDocName').innerText = labels.name;
    document.getElementById('pdfDocTitle').innerText = labels.title;
    document.getElementById('pdfRecipientLabel').innerText = labels.recipient;
    document.getElementById('pdfNumberLabel').innerText = labels.number;
    document.getElementById('pdfDateLabel').innerText = labels.date;
    document.getElementById('pdfTotalLabel').innerText = labels.total;
}

function toggleDiscount() {
    applyDiscount = document.getElementById('discountToggle').checked;
    if (currentType === 'center') {
        selectedOptions.forEach(opt => {
            const item = optionData.center[opt.index];
            opt.price = applyDiscount ? item.discountPrice : item.basePrice;
        });
    }
    renderOptions();
    updateTotalFromOptions();
}

function generateInvoiceNumber() {
    const today = new Date().toISOString().substring(0, 10);
    const key = `ihab_daily_counter_${today}`;
    const next = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, next.toString());
    return `${today}-${String(next).padStart(2, '0')}`;
}

document.getElementById('inputDate').value = new Date().toISOString().substring(0, 10);

function goStep(stepNum) {
    document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
    document.getElementById('step' + stepNum).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectType(type) {
    currentType = type;
    applyDiscount = false;
    const toggle = document.getElementById('discountToggle');
    if (toggle) toggle.checked = false;
    if (type === 'center') {
        selectedOptions = [{ index: 0, price: 0, qty: 1 }];
    } else {
        selectedOptions = [];
    }
    renderOptions();
    goStep(1);
}

selectType('center');

function renderOptions() {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = "";
    const items = optionData[currentType];
    const isCenter = currentType === 'center';

    items.forEach((item, index) => {
        const sel = selectedOptions.find(o => o.index === index);
        const isSelected = !!sel;
        const price = sel ? sel.price : '';
        const qty = sel ? sel.qty : 1;

        const card = document.createElement('div');
        card.className = 'option-card' + (isSelected ? ' selected' : '');
        card.id = `opt-card-${index}`;

        if (item.isCustom) {
            card.innerHTML = `
                <div class="option-header">
                    <div class="option-headline-left">
                        <span class="option-number">${item.label || item.id}</span>
                        <span class="option-product-name" id="custom-title-display-${index}">${item.title || '커스텀 직접 입력'}</span>
                    </div>
                </div>
                <div class="option-body expanded" id="opt-body-${index}">
                    <div class="composition-title">품목명 및 상세 구성 직접 입력</div>
                    <div class="custom-field-group">
                        <label class="custom-field-label">품목명</label>
                        <input type="text" class="custom-field-input" id="custom-title-${index}"
                               value="${item.title || ''}" placeholder="예: 말귀 맞춤형 패키지"
                               oninput="updateCustomField(${index})" onclick="event.stopPropagation()">
                    </div>
                    <div class="custom-field-group">
                        <label class="custom-field-label">품목 및 상세 구성</label>
                        <textarea class="custom-field-textarea" id="custom-desc-${index}"
                                  placeholder="상세 구성을 입력하세요 (줄바꿈으로 항목 구분)"
                                  oninput="updateCustomField(${index})" onclick="event.stopPropagation()">${item.desc || ''}</textarea>
                    </div>
                </div>
                <div class="custom-price-section">
                    <div class="custom-price-inputs">
                        <div class="price-input-col">
                            <div class="price-info-label">공개용 기준가</div>
                            <div class="custom-price-input-wrap">
                                <input type="number" class="custom-price-field" id="custom-base-${index}"
                                       value="${item.basePrice || ''}" placeholder="기준가 입력"
                                       oninput="updateCustomField(${index})" onclick="event.stopPropagation()">
                                <span class="custom-price-unit">원</span>
                            </div>
                        </div>
                        <div class="price-input-col">
                            <div class="price-info-label">안내용 할인가</div>
                            <div class="custom-price-input-wrap">
                                <input type="number" class="custom-price-field" id="custom-discount-${index}"
                                       value="${item.discountPrice || ''}" placeholder="할인가 입력"
                                       oninput="updateCustomField(${index})" onclick="event.stopPropagation()">
                                <span class="custom-price-unit">원</span>
                            </div>
                        </div>
                    </div>
                    <div class="option-qty-row ${isSelected ? 'visible' : ''}" id="qty-group-${index}">
                        <span class="option-qty-label">수량</span>
                        <input type="number" class="option-qty-input" id="qty-${index}" value="${qty}" min="1" oninput="updateQty(${index})">
                        <span class="option-qty-unit">개</span>
                    </div>
                </div>
            `;
        } else {
            let priceSection = '';
            if (isCenter) {
                const discPct = (item.basePrice > 0 && item.discountPrice < item.basePrice)
                    ? Math.round((1 - item.discountPrice / item.basePrice) * 100) : 0;
                priceSection = `
                    <div class="option-price-info">
                        <div class="price-info-col">
                            <div class="price-info-label">공개용 기준가</div>
                            <div class="price-info-value ${applyDiscount ? '' : 'highlight'}" id="price-display-base-${index}">${item.basePrice.toLocaleString('ko-KR')} 원</div>
                        </div>
                        <div class="price-info-col">
                            <div class="price-info-label">안내용 할인가</div>
                            <div class="price-info-value ${applyDiscount ? 'highlight' : ''}" id="price-display-discount-${index}">${item.discountPrice.toLocaleString('ko-KR')} 원${applyDiscount && discPct > 0 ? ` <span class="price-info-badge">-${discPct}%</span>` : ''}</div>
                        </div>
                    </div>
                    <div class="option-qty-row ${isSelected ? 'visible' : ''}" id="qty-group-${index}">
                        <span class="option-qty-label">수량</span>
                        <input type="number" class="option-qty-input" id="qty-${index}" value="${qty}" min="1" oninput="updateQty(${index})">
                        <span class="option-qty-unit">개</span>
                    </div>`;
            } else {
                priceSection = `
                    <div class="option-price-row ${isSelected ? 'visible' : ''}" id="price-group-${index}">
                        <span class="option-price-label">단가</span>
                        <input type="number" class="option-price-input" id="price-${index}" value="${price}" placeholder="금액 입력" oninput="updateOptionPrice(${index})">
                        <span class="option-price-unit">원</span>
                        <span class="option-qty-label" style="margin-left:8px;">수량</span>
                        <input type="number" class="option-qty-input" id="qty-${index}" value="${qty}" min="1" oninput="updateQty(${index})">
                        <span class="option-qty-unit">개</span>
                    </div>`;
            }

            const initDiscPct = (item.basePrice > 0 && item.discountPrice < item.basePrice)
                ? Math.round((1 - item.discountPrice / item.basePrice) * 100) : 0;

            card.innerHTML = `
                <div class="option-header" onclick="toggleCardSelection(${index})">
                    <div class="option-headline-left">
                        <input type="checkbox" class="option-checkbox" id="chk-${index}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleCardSelection(${index})">
                        <span class="option-number">${item.id}</span>
                        <span class="option-product-name">${item.title}</span>
                    </div>
                    <button type="button" class="toggle-btn" id="toggle-btn-${index}" onclick="toggleFold(event, ${index})">펼치기</button>
                </div>
                <div class="option-body" id="opt-body-${index}">
                    <div class="composition-title">상세 품목 구성</div>
                    <div class="composition-text">${item.desc}</div>
                    <div class="composition-title" style="margin-top:20px; padding-top:16px; border-top:1px dashed #e2e8f0;">가격 수정</div>
                    <div style="display:flex; border:1px solid #e8edf3; border-radius:6px; overflow:hidden; margin-top:6px;">
                        <div class="price-input-col">
                            <div class="price-info-label">공개용 기준가</div>
                            <div class="custom-price-input-wrap">
                                <input type="number" class="custom-price-field" id="edit-base-${index}" value="${item.basePrice}" placeholder="기준가 입력" oninput="updateOptionPriceField(${index})" onclick="event.stopPropagation()">
                                <span class="custom-price-unit">원</span>
                            </div>
                        </div>
                        <div class="price-input-col">
                            <div class="price-info-label">안내용 할인가 <span class="rate-badge" id="edit-disc-badge-${index}" style="display:${initDiscPct > 0 ? 'inline-block' : 'none'};">${initDiscPct > 0 ? `-${initDiscPct}%` : ''}</span></div>
                            <div class="custom-price-input-wrap">
                                <input type="number" class="custom-price-field" id="edit-discount-${index}" value="${item.discountPrice}" placeholder="할인가 입력" oninput="updateOptionPriceField(${index})" onclick="event.stopPropagation()">
                                <span class="custom-price-unit">원</span>
                            </div>
                        </div>
                    </div>
                </div>
                ${priceSection}
            `;
        }
        container.appendChild(card);
    });
}

function toggleCardSelection(index) {
    const checkbox = document.getElementById(`chk-${index}`);
    const card = document.getElementById(`opt-card-${index}`);
    const isCenter = currentType === 'center';
    const existingIdx = selectedOptions.findIndex(o => o.index === index);

    if (existingIdx >= 0) {
        selectedOptions.splice(existingIdx, 1);
        card.classList.remove('selected');
        checkbox.checked = false;
        if (isCenter) {
            document.getElementById(`qty-group-${index}`).classList.remove('visible');
        } else {
            document.getElementById(`price-group-${index}`).classList.remove('visible');
        }
    } else {
        const price = isCenter ? (applyDiscount ? optionData.center[index].discountPrice : optionData.center[index].basePrice) : 0;
        const qtyEl = document.getElementById(`qty-${index}`);
        const initQty = qtyEl ? Math.max(1, parseInt(qtyEl.value) || 1) : 1;
        selectedOptions.push({ index, price, qty: initQty });
        card.classList.add('selected');
        checkbox.checked = true;
        if (isCenter) {
            document.getElementById(`qty-group-${index}`).classList.add('visible');
            if (optionData.center[index]?.isCustom) {
                const body = document.getElementById(`opt-body-${index}`);
                const btn = document.getElementById(`toggle-btn-${index}`);
                if (body && !body.classList.contains('expanded')) {
                    body.classList.add('expanded');
                    if (btn) btn.innerText = '접기';
                }
                document.getElementById(`custom-title-${index}`)?.focus();
            } else {
                document.getElementById(`qty-${index}`).focus();
            }
        } else {
            document.getElementById(`price-group-${index}`).classList.add('visible');
            document.getElementById(`price-${index}`).focus();
        }
    }
    updateTotalFromOptions();
}

function toggleFold(event, index) {
    event.stopPropagation();
    const body = document.getElementById(`opt-body-${index}`);
    const btn = document.getElementById(`toggle-btn-${index}`);
    if (body.classList.contains('expanded')) {
        body.classList.remove('expanded');
        btn.innerText = "펼치기";
    } else {
        body.classList.add('expanded');
        btn.innerText = "접기";
    }
}

function updateCustomField(index) {
    const item = optionData.center[index];
    const titleVal = document.getElementById(`custom-title-${index}`)?.value || '';
    const descVal = document.getElementById(`custom-desc-${index}`)?.value || '';
    const baseVal = parseFloat(document.getElementById(`custom-base-${index}`)?.value) || 0;
    const discountVal = parseFloat(document.getElementById(`custom-discount-${index}`)?.value) || 0;

    item.title = titleVal;
    item.desc = descVal;
    item.basePrice = baseVal;
    item.discountPrice = discountVal;
    item.cost = baseVal;

    const display = document.getElementById(`custom-title-display-${index}`);
    if (display) display.innerText = titleVal || '커스텀 직접 입력';

    const opt = selectedOptions.find(o => o.index === index);
    if (opt) {
        opt.price = applyDiscount ? discountVal : baseVal;
        updateTotalFromOptions();
    }
}

function updateOptionPriceField(index) {
    const item = optionData.center[index];
    const baseVal = Math.round(parseFloat(document.getElementById(`edit-base-${index}`)?.value) || 0);
    const discountVal = Math.round(parseFloat(document.getElementById(`edit-discount-${index}`)?.value) || 0);

    item.basePrice = baseVal;
    item.discountPrice = discountVal;
    item.cost = baseVal;

    const discPct = (baseVal > 0 && discountVal < baseVal)
        ? Math.round((1 - discountVal / baseVal) * 100) : 0;

    const badge = document.getElementById(`edit-disc-badge-${index}`);
    if (badge) {
        badge.style.display = discPct > 0 ? 'inline-block' : 'none';
        badge.innerText = discPct > 0 ? `-${discPct}%` : '';
    }

    const basePriceDisplay = document.getElementById(`price-display-base-${index}`);
    const discountPriceDisplay = document.getElementById(`price-display-discount-${index}`);
    if (basePriceDisplay) {
        basePriceDisplay.className = `price-info-value ${applyDiscount ? '' : 'highlight'}`;
        basePriceDisplay.innerText = baseVal.toLocaleString('ko-KR') + ' 원';
    }
    if (discountPriceDisplay) {
        discountPriceDisplay.className = `price-info-value ${applyDiscount ? 'highlight' : ''}`;
        discountPriceDisplay.innerHTML = discountVal.toLocaleString('ko-KR') + ' 원' +
            (applyDiscount && discPct > 0 ? ` <span class="price-info-badge">-${discPct}%</span>` : '');
    }

    const opt = selectedOptions.find(o => o.index === index);
    if (opt) {
        opt.price = applyDiscount ? discountVal : baseVal;
        updateTotalFromOptions();
    }
}

function updateOptionPrice(index) {
    const price = parseFloat(document.getElementById(`price-${index}`).value) || 0;
    const opt = selectedOptions.find(o => o.index === index);
    if (opt) opt.price = price;
    updateTotalFromOptions();
}

function updateQty(index) {
    const raw = parseInt(document.getElementById(`qty-${index}`).value);
    const opt = selectedOptions.find(o => o.index === index);
    if (opt && raw >= 1) {
        opt.qty = raw;
        updateTotalFromOptions();
    }
}

function syncQtyFromDOM() {
    selectedOptions.forEach(opt => {
        const el = document.getElementById(`qty-${opt.index}`);
        if (el) {
            const val = Math.max(1, parseInt(el.value) || 1);
            el.value = val;
            opt.qty = val;
        }
        if (currentType !== 'center') {
            const priceEl = document.getElementById(`price-${opt.index}`);
            if (priceEl) opt.price = parseFloat(priceEl.value) || 0;
        }
        if (currentType === 'center' && optionData.center[opt.index]?.isCustom) {
            updateCustomField(opt.index);
        }
    });
}

function updateTotalFromOptions() {
    const totalSupply = selectedOptions.reduce((sum, o) => sum + (o.price || 0) * (o.qty || 1), 0);
    const tax = Math.floor(totalSupply * 0.1);
    const total = totalSupply + tax;
    document.getElementById('inputSupplyPrice').value = totalSupply.toLocaleString('ko-KR');
    document.getElementById('inputTaxPrice').value = tax.toLocaleString('ko-KR');
    document.getElementById('inputTotalPrice').value = total.toLocaleString('ko-KR');
}

function validateAndGoStep2() {
    if (selectedOptions.length === 0) {
        alert("품목 옵션을 하나 이상 선택해 주세요.");
        return;
    }
    syncQtyFromDOM();
    if (currentType === 'center') {
        const customIdx = optionData.center.findIndex(i => i.isCustom);
        const hasCustom = selectedOptions.some(o => o.index === customIdx);
        if (hasCustom && !optionData.center[customIdx].title.trim()) {
            alert("커스텀 옵션(옵션1)의 품목명을 입력해 주세요.");
            return;
        }
    }
    updateTotalFromOptions();
    goStep(2);
}

function fmt(n) { return n.toLocaleString('ko-KR'); }

function buildInvoiceRows() {
    const isCenter = currentType === 'center';
    const totalSupply = selectedOptions.reduce((sum, o) => sum + (o.price || 0) * (o.qty || 1), 0);
    const grandTotal = totalSupply + Math.floor(totalSupply * 0.1);

    let rows = selectedOptions.map(opt => {
        const item = optionData[currentType][opt.index];
        const unitPrice = opt.price || 0;
        const qty = opt.qty || 1;
        const lineSupply = unitPrice * qty;
        const lineTotal = lineSupply + Math.floor(lineSupply * 0.1);

        let priceCell = '';
        if (isCenter && item.basePrice && applyDiscount) {
            const discPct = Math.round((1 - unitPrice / item.basePrice) * 100);
            priceCell = `
                <div class="rate-base">${fmt(item.basePrice)} 원 <span class="rate-badge">-${discPct}%</span></div>
                <div class="rate-discount">${fmt(unitPrice)} 원</div>`;
        } else {
            priceCell = `${fmt(unitPrice)} 원`;
        }

        const displayTitle = item.title || (item.isCustom ? '커스텀 옵션' : '');
        const descHtml = item.isCustom
            ? item.desc.split('\n').filter(l => l.trim()).map(l => `<div class="desc-l3">${l}</div>`).join('')
            : item.desc;

        return `
            <tr>
                <td style="font-weight:700; font-size:14px; color:#499cdf;">${item.id.replace('옵션', '')}</td>
                <td>
                    <div class="table-item-title">${displayTitle}</div>
                    <div class="table-item-desc">${descHtml}</div>
                </td>
                <td class="text-right" style="font-weight:600; color:#202020;">${qty}개</td>
                <td class="text-right rate-cell">${priceCell}</td>
                <td class="text-right total-cell">${fmt(lineTotal)} 원</td>
            </tr>
        `;
    }).join('');

    if (selectedOptions.length > 1) {
        rows += `
            <tr class="invoice-summary-row">
                <td colspan="3" class="text-right" style="font-weight:700; font-size:13px; color:#64748b;">합 계</td>
                <td class="text-right" style="font-weight:700; font-size:14px; color:#202020;">${fmt(totalSupply)} 원</td>
                <td class="text-right" style="font-weight:800; font-size:15px; color:#499cdf;">${fmt(grandTotal)} 원</td>
            </tr>
        `;
    }
    return { rows, totalSupply, grandTotal };
}

function generateInvoice() {
    const clientName = document.getElementById('inputClientName').value.trim();
    const managerName = document.getElementById('inputManagerName').value.trim();
    const invoiceDate = document.getElementById('inputDate').value;
    const remarks = document.getElementById('inputRemarks').value.trim();

    syncQtyFromDOM();
    if (!clientName) { alert("고객명을 입력해 주세요."); return; }
    if (!invoiceDate) { alert("견적일자를 선택해 주세요."); return; }
    if (selectedOptions.length === 0) { alert("옵션을 선택해 주세요."); return; }

    const totalSupply = selectedOptions.reduce((sum, o) => sum + (o.price || 0), 0);
    if (currentType !== 'center' && totalSupply <= 0) {
        alert("옵션별 공급가액을 입력해 주세요."); return;
    }

    if (!currentInvoiceNumber) currentInvoiceNumber = generateInvoiceNumber();

    displayInvoicePreview({ clientName, managerName, invoiceDate, remarks });
    saveCurrentSession();
}

function printInvoice() {
    const today = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    const clientName = document.getElementById('pdfClientName').innerText.trim() || '기관명';
    const originalTitle = document.title;
    document.title = `${today}-아이해브${docTypeLabels[docType].name}-${clientName}`;
    window.onafterprint = () => {
        document.title = originalTitle;
        window.onafterprint = null;
    };
    window.print();
}

function resetSystem() {
    document.getElementById('inputClientName').value = "";
    document.getElementById('inputManagerName').value = "";
    document.getElementById('inputSupplyPrice').value = "0";
    document.getElementById('inputTaxPrice').value = "0";
    document.getElementById('inputTotalPrice').value = "0";
    document.getElementById('inputRemarks').value = "";
    currentEditingId = null;
    currentInvoiceNumber = null;
    applyDiscount = false;
    const toggle = document.getElementById('discountToggle');
    if (toggle) toggle.checked = false;
    const customIdx = optionData.center.findIndex(i => i.isCustom);
    if (customIdx >= 0) {
        Object.assign(optionData.center[customIdx], { title: '', desc: '', basePrice: 0, discountPrice: 0, cost: 0 });
    }
    selectedOptions = currentType === 'center' ? [{ index: 0, price: 0, qty: 1 }] : [];

    document.getElementById('workspaceContainer').style.display = "block";
    document.getElementById('invoicePreviewWrapper').style.display = "none";
    clearCurrentSession();
    renderSavedList();
    goStep(1);
}

function getSavedList() {
    return JSON.parse(localStorage.getItem('ihab_invoices') || '[]');
}

function saveInvoice() {
    syncQtyFromDOM();
    const id = currentEditingId || Date.now().toString();

    let customSnapshot = null;
    if (currentType === 'center') {
        const customIdx = optionData.center.findIndex(i => i.isCustom);
        if (customIdx >= 0 && selectedOptions.some(o => o.index === customIdx)) {
            const ci = optionData.center[customIdx];
            customSnapshot = { title: ci.title, desc: ci.desc, basePrice: ci.basePrice, discountPrice: ci.discountPrice };
        }
    }

    const invoice = {
        id,
        invoiceNumber: currentInvoiceNumber,
        applyDiscount,
        docType,
        savedAt: new Date().toISOString(),
        type: currentType,
        selectedOptions: [...selectedOptions],
        customSnapshot,
        clientName: document.getElementById('inputClientName').value.trim(),
        managerName: document.getElementById('inputManagerName').value.trim(),
        invoiceDate: document.getElementById('inputDate').value,
        remarks: document.getElementById('inputRemarks').value.trim()
    };

    const list = getSavedList();
    const existingIdx = list.findIndex(i => i.id === id);
    if (existingIdx >= 0) {
        list[existingIdx] = invoice;
    } else {
        list.unshift(invoice);
    }
    localStorage.setItem('ihab_invoices', JSON.stringify(list));
    currentEditingId = invoice.id;
    alert(`${docTypeLabels[docType].name}가 저장되었습니다.`);
}

function getTotalFromInv(inv) {
    if (inv.selectedOptions) {
        return inv.selectedOptions.reduce((s, o) => s + (o.price || 0) * (o.qty || 1), 0);
    }
    return inv.supplyVal || 0;
}

function toggleSavedList() {
    const container = document.getElementById('savedListContainer');
    const icon = document.getElementById('savedListToggleIcon');
    const isOpen = container.style.display !== 'none';
    container.style.display = isOpen ? 'none' : 'block';
    icon.innerText = isOpen ? '펼치기 ▾' : '접기 ▴';
}

function renderSavedList() {
    const list = getSavedList();
    const section = document.getElementById('savedListSection');
    const container = document.getElementById('savedListContainer');
    const countEl = document.getElementById('savedListCount');

    if (list.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    countEl.innerText = `총 ${list.length}건`;

    container.innerHTML = list.map(inv => {
        const totalSupply = getTotalFromInv(inv);
        const grandTotal = totalSupply + Math.floor(totalSupply * 0.1);
        const typeLabel = (docTypeLabels[inv.docType] || docTypeLabels.quote).name;
        const optCount = inv.selectedOptions ? inv.selectedOptions.length : 1;
        const firstOptIdx = inv.selectedOptions ? inv.selectedOptions[0].index : inv.selectedOptionIndex;
        const firstItem = optionData[inv.type][firstOptIdx];
        const firstTitle = (firstItem?.isCustom)
            ? (inv.customSnapshot?.title || '커스텀 옵션')
            : (firstItem?.title || '');
        const optLabel = optCount > 1 ? `옵션 ${optCount}개` : firstTitle;

        return `
            <div class="saved-item-card">
                <div>
                    <div class="saved-item-client">${inv.clientName}</div>
                    <div class="saved-item-meta">${typeLabel} · ${optLabel} · ${inv.invoiceDate} · 합계 ${fmt(grandTotal)}원</div>
                </div>
                <div class="saved-item-actions">
                    <button class="btn-secondary" style="padding:6px 14px; font-size:13px;" onclick="viewInvoice('${inv.id}')">보기</button>
                    <button class="btn-secondary" style="padding:6px 14px; font-size:13px;" onclick="editInvoice('${inv.id}')">수정</button>
                    <button class="btn-danger" onclick="deleteInvoice('${inv.id}')">삭제</button>
                </div>
            </div>
        `;
    }).join('');
}

function restoreInvoiceState(inv) {
    currentType = inv.type;
    setDocType(inv.docType || 'quote');
    applyDiscount = inv.applyDiscount || false;
    const toggle = document.getElementById('discountToggle');
    if (toggle) toggle.checked = applyDiscount;
    if (inv.selectedOptions) {
        selectedOptions = inv.selectedOptions.map(o => ({ ...o, qty: o.qty || 1 }));
    } else {
        selectedOptions = [{ index: inv.selectedOptionIndex, price: inv.supplyVal || 0, qty: 1 }];
    }
    if (inv.customSnapshot && inv.type === 'center') {
        const customIdx = optionData.center.findIndex(i => i.isCustom);
        if (customIdx >= 0) Object.assign(optionData.center[customIdx], inv.customSnapshot);
    }
}

function displayInvoicePreview(inv) {
    applyDocTypeToPreview();
    document.getElementById('pdfInvoiceNumber').innerText = currentInvoiceNumber || '-';
    document.getElementById('pdfClientName').innerText = inv.clientName;
    document.getElementById('pdfManagerName').innerHTML = `<span style="color:#94a3b8;">담당자:</span> ${inv.managerName || '귀하'}`;

    const dateObj = new Date(inv.invoiceDate);
    const formattedDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth()+1}월 ${dateObj.getDate()}일`;
    document.getElementById('pdfDate').innerText = formattedDate;

    const dueDateObj = new Date(dateObj);
    dueDateObj.setDate(dueDateObj.getDate() + 30);
    const formattedDueDate = `${dueDateObj.getFullYear()}년 ${dueDateObj.getMonth()+1}월 ${dueDateObj.getDate()}일`;
    document.getElementById('pdfDueDateBanner').innerText = formattedDueDate;

    const { rows, grandTotal } = buildInvoiceRows();
    document.getElementById('invoiceTableBody').innerHTML = rows;

    document.getElementById('pdfGrandTotalBanner').innerText = fmt(grandTotal) + " 원";
    document.getElementById('pdfRemarks').innerText = inv.remarks || docTypeLabels[docType].defaultRemarks;

    document.getElementById('workspaceContainer').style.display = "none";
    document.getElementById('invoicePreviewWrapper').style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildSessionSnapshot() {
    let customSnapshot = null;
    if (currentType === 'center') {
        const customIdx = optionData.center.findIndex(i => i.isCustom);
        if (customIdx >= 0 && selectedOptions.some(o => o.index === customIdx)) {
            const ci = optionData.center[customIdx];
            customSnapshot = { title: ci.title, desc: ci.desc, basePrice: ci.basePrice, discountPrice: ci.discountPrice };
        }
    }
    return {
        invoiceNumber: currentInvoiceNumber,
        applyDiscount,
        docType,
        type: currentType,
        selectedOptions: [...selectedOptions],
        customSnapshot,
        clientName: document.getElementById('inputClientName').value.trim(),
        managerName: document.getElementById('inputManagerName').value.trim(),
        invoiceDate: document.getElementById('inputDate').value,
        remarks: document.getElementById('inputRemarks').value.trim()
    };
}

function saveCurrentSession() {
    localStorage.setItem('ihab_current_session', JSON.stringify(buildSessionSnapshot()));
}

function clearCurrentSession() {
    localStorage.removeItem('ihab_current_session');
}

function viewInvoice(id) {
    const inv = getSavedList().find(i => i.id === id);
    if (!inv) return;

    currentEditingId = inv.id;
    currentInvoiceNumber = inv.invoiceNumber || null;
    restoreInvoiceState(inv);

    document.getElementById('inputClientName').value = inv.clientName;
    document.getElementById('inputManagerName').value = inv.managerName;
    document.getElementById('inputDate').value = inv.invoiceDate;
    document.getElementById('inputRemarks').value = inv.remarks || '';
    updateTotalFromOptions();

    displayInvoicePreview(inv);
    saveCurrentSession();
}

function deleteInvoice(id) {
    if (!confirm('이 문서를 삭제하시겠습니까?')) return;
    const list = getSavedList().filter(i => i.id !== id);
    localStorage.setItem('ihab_invoices', JSON.stringify(list));
    renderSavedList();
}

function editInvoice(id) {
    const inv = getSavedList().find(i => i.id === id);
    if (!inv) return;

    currentEditingId = inv.id;
    currentInvoiceNumber = inv.invoiceNumber || null;
    restoreInvoiceState(inv);
    renderOptions();

    document.getElementById('inputClientName').value = inv.clientName;
    document.getElementById('inputManagerName').value = inv.managerName;
    document.getElementById('inputDate').value = inv.invoiceDate;
    document.getElementById('inputRemarks').value = inv.remarks || '';
    updateTotalFromOptions();

    clearCurrentSession();
    goStep(1);
}

renderSavedList();

// 새로고침 시 마지막으로 생성/조회한 견적서 화면 복원
(function restoreCurrentSession() {
    const raw = localStorage.getItem('ihab_current_session');
    if (!raw) return;
    let inv;
    try { inv = JSON.parse(raw); } catch (e) { return; }
    if (!inv || !inv.selectedOptions || inv.selectedOptions.length === 0) return;

    currentInvoiceNumber = inv.invoiceNumber || null;
    restoreInvoiceState(inv);

    document.getElementById('inputClientName').value = inv.clientName;
    document.getElementById('inputManagerName').value = inv.managerName;
    document.getElementById('inputDate').value = inv.invoiceDate;
    document.getElementById('inputRemarks').value = inv.remarks || '';
    updateTotalFromOptions();

    displayInvoicePreview(inv);
})();

// 스크롤 휠로 number input 값이 변경되는 브라우저 기본 동작 방지
document.addEventListener('wheel', function () {
    if (document.activeElement.type === 'number') {
        document.activeElement.blur();
    }
}, { capture: true, passive: true });
