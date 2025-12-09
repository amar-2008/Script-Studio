# AI AMAR Assistant

المساعد الشخصي الذكي الفاخر، تم تطويره خصيصاً للمطور **عمار مصطفى نوفل**.

## المميزات
- محادثة ذكية مع Gemini 2.5 Flash.
- تحليل الصور وفهم محتواها.
- توليد صور عالية الجودة (1K, 2K, 4K) باستخدام Gemini 3 Pro Image Preview.
- تعديل الصور باستخدام Gemini 2.5 Flash Image.
- واجهة فاخرة (Luxury UI) تدعم الوضع الليلي.
- علامة مائية تلقائية (AMAR script).

## طريقة التشغيل محلياً (Local Development)

1. تأكد من وجود Node.js مثبت على جهازك.
2. افتح التيرمينال في مجلد المشروع واكتب:
   ```bash
   npm install
   ```
3. أنشئ ملف `.env` في المجلد الرئيسي وضع فيه مفتاحك:
   ```env
   API_KEY=YOUR_GEMINI_API_KEY_HERE
   ```
   *(استبدل `YOUR_GEMINI_API_KEY_HERE` بمفتاحك من Google AI Studio)*
   
4. شغل المشروع:
   ```bash
   npm run dev
   ```

## طريقة النشر (Deployment)

أفضل طريقة للنشر هي عبر **Vercel**:

1. ارفع المشروع على GitHub.
2. اذهب إلى Vercel واعمل Import للمشروع.
3. في خانة Environment Variables، أضف `API_KEY`.
4. اضغط Deploy.