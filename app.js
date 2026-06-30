async function generateReport() {
    const textInput = document.getElementById('rawInput').value;
    const fileInput = document.getElementById('fileInput').files[0];

    if (!textInput && !fileInput) {
        alert("Please paste some findings or upload a file first!");
        return;
    }

    // تهيئة الواجهة لبدء التحميل واكتشاف الثغرات
    document.getElementById('loading').classList.remove('d-none');
    
    const dashboard = document.getElementById('reportDashboard') || document.getElementById('report-dashboard');
    if (dashboard) dashboard.classList.add('d-none');

    const formData = new FormData();
    // إرسال النص دائماً حتى لو فارغ لضمان استقرار طلب الـ Form مع FastAPI
    formData.append('text_input', textInput || '');
    if (fileInput) formData.append('file', fileInput);

    try {
        // 🚀 الرابط معدل بالكامل بـ HTTPS ليعمل أونلاين على GitHub Pages بدون حظر أمني
        const response = await fetch('https://ai-security-report-generator.onrender.com/api/analyze', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Server error: ${response.status}`);
        }

        const data = await response.json();
        
        // استدعاء دالة العرض وحقن البيانات في الـ HTML
        displayReport(data);

    } catch (error) {
        alert(`Failed: ${error.message}`);
        console.error(error);
    } finally {
        document.getElementById('loading').classList.add('d-none');
    }
}

// 🛡️ دالة استقبال البيانات وتوزيعها داخل الـ Dashboard بشكل متكامل على كل الأقسام
function displayReport(data) {
    // 1. إظهار لوحة التحكم بالكامل
    const dashboard = document.getElementById('reportDashboard') || document.getElementById('report-dashboard');
    if (dashboard) dashboard.classList.remove('d-none');

    // 2. عرض الملخص التنفيذي (Executive Summary)
    const execSummary = document.getElementById('executiveSummary');
    if (execSummary) {
        execSummary.innerText = data.executive_summary || 'No executive summary available.';
    }

    // 3. عرض رؤى الذكاء الاصطناعي (AI Insights)
    const aiInsights = document.getElementById('aiInsights');
    if (aiInsights) {
        aiInsights.innerText = data.ai_insights || 'No AI insights available.';
    }

    // 4. بناء جدول الثغرات بشكل نظيف ومختصر (Vulnerability Breakdown)
    const tableBody = document.getElementById('vulnerabilitiesList') || document.querySelector('table tbody');
    if (tableBody) {
        tableBody.innerHTML = ''; // تنظيف البيانات القديمة
        const vulnerabilities = data.vulnerabilities || [];
        
        vulnerabilities.forEach(vuln => {
            let badgeColor = 'bg-secondary';
            const severity = (vuln.severity || '').toLowerCase();
            if (severity === 'high' || severity === 'critical') badgeColor = 'bg-danger';
            else if (severity === 'medium') badgeColor = 'bg-warning text-dark';
            else if (severity === 'low') badgeColor = 'bg-success';

            const row = `
    <tr>
        <td class="text-info fw-bold">📌 ${vuln.name || 'Unknown'}</td>
        <td><span class="badge ${badgeColor}">${(vuln.severity || 'LOW').toUpperCase()}</span></td>
        <td><span class="badge bg-primary">${vuln.cvss_score || 'N/A'}</span></td>
        <td>
            <span class="text-warning small d-block">CWE: ${vuln.cwe_id || 'N/A'}</span>
            <span class="text-info small d-block">OWASP: ${vuln.owasp_mapping || 'N/A'}</span>
        </td>
    </tr>
`;
tableBody.innerHTML += row;
        });
    }

    // 5. بناء قسم التفاصيل التقنية والتوصيات (Detailed Technical View)
    const techDetails = document.getElementById('technicalDetails');
    if (techDetails && data.vulnerabilities && data.vulnerabilities.length > 0) {
        techDetails.innerHTML = ''; // تنظيف المحتوى القديم
        data.vulnerabilities.forEach(vuln => {
            // داخل الـ loop الخاص بالبطاقات
techDetails.innerHTML += `
    <div class="mb-4 p-3 border border-secondary rounded bg-dark text-start">
        <div class="d-flex justify-content-between">
            <h5 class="text-info">📌 ${vuln.name}</h5>
            <div>
                <span class="badge bg-danger">CVSS: ${vuln.cvss_score}</span>
                <span class="badge bg-secondary">${vuln.cwe_id}</span>
            </div>
        </div>
        <p class="text-muted small">OWASP Mapping: ${vuln.owasp_mapping}</p>
        <p class="text-light mt-2"><strong>Explanation:</strong> ${vuln.explanation || ''}</p>
        <p class="text-warning"><strong>Impact:</strong> ${vuln.impact || ''}</p>
        <p class="text-success"><strong>💡 Recommendation:</strong> ${vuln.recommendation || ''}</p>
    </div>
`;
        });
    }
}
// دالة تصدير التقرير لـ PDF
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    // التقاط كامل الـ Dashboard
    const element = document.getElementById('reportDashboard');
    
    // إضافة استثناء للزر عشان ما يظهر في الـ PDF (اختياري)
    const button = document.querySelector('button[onclick="exportToPDF()"]');
    if (button) button.style.display = 'none';

    const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#1a1a1a',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
    });

    if (button) button.style.display = 'block'; // إرجاع الزر

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('AI_Security_Report.pdf');
}