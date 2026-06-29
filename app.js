async function generateReport() {
    const textInput = document.getElementById('rawInput').value;
    const fileInput = document.getElementById('fileInput').files[0];
    
    if (!textInput && !fileInput) {
        alert("Please paste some findings or upload a file first!");
        return;
    }

    // إظهار شاشة التحميل وإخفاء التقرير القديم إن وجد
    document.getElementById('loading').classList.remove('d-none');
    document.getElementById('reportDashboard').classList.add('d-none');

    // تجهيز البيانات لإرسالها كـ FormData للسيرفر
    const formData = new FormData();
    if (textInput) formData.append('text_input', textInput);
    if (fileInput) formData.append('file', fileInput);

    try {
        // الاتصال بسيرفر البايثون (FastAPI) المحلي
        const response = await fetch('http://127.0.0.1:8000/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error("Server error");

        const data = await response.json();
        displayReport(data);

    } catch (error) {
        alert("Failed to connect to the backend server. Make sure app.py is running!");
        console.error(error);
    } finally {
        // إخفاء مؤشر التحميل
        document.getElementById('loading').classList.add('d-none');
    }
}

function displayReport(data) {
    // إظهار لوحة التقرير
    document.getElementById('reportDashboard').classList.remove('d-none');
    
    // وضع الملخص التنفيذي والأفكار العامة
    document.getElementById('execSummary').innerText = data.executive_summary;
    document.getElementById('aiInsights').innerText = data.ai_insights;

    // 1. بناء جدول الثغرات الرئيسي
    const tbody = document.getElementById('vulnTableBody');
    tbody.innerHTML = ""; 

    // 2. بناء القسم التفصيلي (Cards)
    const detailedCards = document.getElementById('detailedCards');
    detailedCards.innerHTML = "";

    data.vulnerabilities.forEach((v, index) => {
        // إضافة سطر للجدول
        const row = `<tr>
            <td><span class="text-info fw-bold">#${index + 1}</span> ${v.name}</td>
            <td><span class="badge badge-${v.severity}">${v.severity}</span></td>
            <td class="text-muted">${v.description}</td>
        </tr>`;
        tbody.innerHTML += row;

        // إضافة كرت تفصيلي ممتد (Expandable Style) لكل ثغرة
        const detailCard = `
            <div class="vuln-detail-box p-3 mb-3">
                <h5 class="text-info font-weight-bold">${v.name} — <small class="text-warning">${v.severity}</small></h5>
                <p class="mb-1"><strong>Technical Explanation:</strong> ${v.explanation}</p>
                <p class="mb-1"><strong>Risk Impact:</strong> <span class="text-danger">${v.impact}</span></p>
                <p class="mb-0 text-success"><strong>Recommendation:</strong> Code Fix: ${v.recommendation}</p>
            </div>
        `;
        detailedCards.innerHTML += detailCard;
    });
}