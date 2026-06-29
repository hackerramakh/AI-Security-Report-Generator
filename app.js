async function generateReport() {
    const textInput = document.getElementById('rawInput').value;
    const fileInput = document.getElementById('fileInput').files[0];

    if (!textInput && !fileInput) {
        alert("Please paste some findings or upload a file first!");
        return;
    }

    // تهيئة الواجهة لبدء التحميل
    document.getElementById('loading').classList.remove('d-none');
    
    const dashboard = document.getElementById('reportDashboard') || document.getElementById('report-dashboard');
    if (dashboard) dashboard.classList.add('d-none');

    const formData = new FormData();
    // إرسال النص دائماً حتى لو فارغ لضمان استقرار طلب الـ Form
    formData.append('text_input', textInput || '');
    if (fileInput) formData.append('file', fileInput);

    try {
        const response = await fetch('https://ai-security-report-generator.onrender.com/api/analyze', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Server error: ${response.status}`);
        }

        const data = await response.json();
        
        // 🚀 استدعاء دالة العرض وحقن البيانات في الـ HTML
        displayReport(data);

    } catch (error) {
        alert(`Failed: ${error.message}`);
        console.error(error);
    } finally {
        document.getElementById('loading').classList.add('d-none');
    }
}

// 🛡️ دالة استقبال البيانات وعرضها داخل الـ Dashboard بشكل متكامل
function displayReport(data) {
    // 1. إظهار لوحة التحكم بالكامل
    const dashboard = document.getElementById('reportDashboard') || document.getElementById('report-dashboard');
    if (dashboard) dashboard.classList.remove('d-none');

    // 2. عرض الملخص التنفيذي
    const execSummary = document.getElementById('executiveSummary');
    if (execSummary) {
        execSummary.innerText = data.executive_summary || 'No executive summary available.';
    }

    // 3. عرض رؤى الذكاء الاصطناعي
    const aiInsights = document.getElementById('aiInsights');
    if (aiInsights) {
        aiInsights.innerText = data.ai_insights || 'No AI insights available.';
    }

    // 4. بناء جدول الثغرات (مختصر وأنيق)
    const tableBody = document.getElementById('vulnerabilitiesList');
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
                    <td>${vuln.description || ''}</td>
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
            techDetails.innerHTML += `
                <div class="mb-4 p-3 border border-secondary rounded bg-dark">
                    <h5 class="text-info">📌 ${vuln.name} - <span class="text-muted">Technical Details</span></h5>
                    <p class="text-light mt-2"><strong>Explanation:</strong> ${vuln.explanation || ''}</p>
                    <p class="text-warning"><strong>Impact:</strong> ${vuln.impact || ''}</p>
                    <p class="text-success"><strong>💡 Recommendation & Mitigation:</strong> ${vuln.recommendation || ''}</p>
                </div>
            `;
        });
    }
}