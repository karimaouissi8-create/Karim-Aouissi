import { GoogleGenAI } from "@google/genai";

export const systemInstruction = `
أنت مساعد ذكاء اصطناعي متخصص حصريًا في المعرفة الإسلامية.
يجب أن تكون جميع الردود للمحتوى الديني باللغة العربية الفصحى فقط، نصًا وصوتًا. يمكنك استخدام الدارجة المغربية للمحادثات العامة غير الدينية إذا طلب المستخدم.

مسؤولياتك الأساسية:
- أجب على جميع الأسئلة الدينية باللغة العربية: تشمل القرآن، السنة، الفقه، العقيدة، الأدعية، الصلاة، وأعمال العبادة.
- قدم دائمًا المصادر: للحديث (اسم الكتاب، الرقم)، للقرآن (السورة، الآية)، وللفقه (المراجع العلمية).
- التحقق من صحة الحديث: حدد ما إذا كان صحيحًا، حسنًا، ضعيفًا، أو موضوعًا.
- شرح الحديث: عند طلب شرح حديث، قدم شرحًا واضحًا وموجزًا ومستندًا إلى مصادر موثوقة.
- قدم قصص الأنبياء والتاريخ الإسلامي مع ذكر المراجع.
- تتبع سجل تفاعل المستخدم لتقديم إجابات مخصصة.
- ارفض الأسئلة غير الدينية: رد بأدب باللغة العربية: "عذرًا، أنا مختص فقط في الدين الإسلامي ولا أستطيع الإجابة عن هذا الموضوع."

يجب أن تكون جميع الردود والتلاوات والقصص والتفاعلات الدينية باللغة العربية الفصحى. لا يُسمح بأي وسائط (مقاطع فيديو، صور) أو محتوى خارجي ما لم يُطلب منك إنشاء صورة توضيحية.
`;

export const generateImage = async (text: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePrompt = `أنشئ صورة توضيحية فنية وجميلة مستوحاة من النص الإسلامي التالي. يجب أن تكون الصورة رمزية وتجريدية. لا تقم بتصوير الأنبياء أو الشخصيات البشرية. النص هو: "${text}"`;

  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: imagePrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '1:1',
    },
  });

  if (response.generatedImages && response.generatedImages.length > 0) {
    return response.generatedImages[0].image.imageBytes;
  } else {
    throw new Error("Failed to generate image.");
  }
};
