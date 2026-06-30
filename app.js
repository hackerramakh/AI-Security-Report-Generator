async function generateReport() {
    const textInput = document.getElementById('rawInput').value;
    const fileInput = document.getElementById('fileInput').files[0];
    const errorDiv = document.getElementById('errorMessage');

    if (errorDiv) errorDiv.classList.add('d-none');

    if (!textInput && !fileInput) {
        alert("Please paste some findings or upload a file first!");
        return;
    }

    document.getElementById('loading').classList.remove('d-none');
    const dashboard = document.getElementById('reportDashboard');
    if (dashboard) dashboard.classList.add('d-none');

    const formData = new FormData();
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
        displayReport(data);

    } catch (error) {
        if (errorDiv) {
            errorDiv.classList.remove('d-none');
            if (error.message.includes('429')) {
                errorDiv.innerText = "⏳ AI Service is currently at capacity. Our free daily quota is full. Please come back tomorrow to continue your security analysis!";
            } else {
                errorDiv.innerText = "❌ An unexpected error occurred. Please try again later.";
            }
        } else {
            alert(`Failed: ${error.message}`);
        }
        console.error(error);
    } finally {
        document.getElementById('loading').classList.add('d-none');
    }
}

function displayReport(data) {
    const dashboard = document.getElementById('reportDashboard');
    if (dashboard) dashboard.classList.remove('d-none');

    const execSummary = document.getElementById('executiveSummary');
    if (execSummary) execSummary.innerText = data.executive_summary || 'No executive summary available.';

    const aiInsights = document.getElementById('aiInsights');
    if (aiInsights) aiInsights.innerText = data.ai_insights || 'No AI insights available.';

    const tableBody = document.querySelector('table tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
        (data.vulnerabilities || []).forEach(vuln => {
            let badgeColor = (vuln.severity === 'high' || vuln.severity === 'critical') ? 'bg-danger' : 
                             (vuln.severity === 'medium') ? 'bg-warning text-dark' : 'bg-success';
            
            tableBody.innerHTML += `
                <tr>
                    <td class="text-info fw-bold">📌 ${vuln.name || 'Unknown'}</td>
                    <td><span class="badge ${badgeColor}">${(vuln.severity || 'LOW').toUpperCase()}</span></td>
                    <td><span class="badge bg-primary">${vuln.cvss_score || 'N/A'}</span></td>
                    <td>
                        <span class="text-warning small d-block">CWE: ${vuln.cwe_id || 'N/A'}</span>
                        <span class="text-info small d-block">OWASP: ${vuln.owasp_mapping || 'N/A'}</span>
                    </td>
                </tr>`;
        });
    }

    const techDetails = document.getElementById('technicalDetails');
    if (techDetails && data.vulnerabilities) {
        techDetails.innerHTML = '';
        data.vulnerabilities.forEach(vuln => {
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
                </div>`;
        });
    }
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const element = document.getElementById('reportDashboard');
    const button = document.querySelector('button[onclick="exportToPDF()"]');
    if (button) button.style.display = 'none';

    const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#1a1a1a',
        windowWidth: element.scrollWidth 
    });

    if (button) button.style.display = 'block';

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('AI_Security_Report.pdf');
}