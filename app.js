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
        // الاتصال بسيرفر البايثون (FastAPI) السحابي على Render
        const response = await fetch('https://ai-security-report-generator.onrender.com/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error("Server error");

        const data = await response.json();
        displayReport(data);

    } catch (error) {
        // التعديل هنا: رسالة احترافية تتناسب مع السيرفر السحابي الخارجي 🛠️
        alert("Failed to connect to the AI Security cloud server. Please try again later!");
        console.error(error);
    } finally {
        // إخفاء مؤشر التحميل
        document.getElementById('loading').classList.add('d-none');
    }
}