const axios = require("axios");

class AIService {
  constructor() {
    // Configuration for different free LLM providers
    this.providers = {
      huggingFace: {
        url: "https://api-inference.huggingface.co/models",
        models: ["mistralai/Mistral-7B-Instruct-v0.1"],
        apiKey: process.env.HF_API_KEY,
      },
    };

    // Default to Hugging Face
    this.activeProvider = "huggingFace";
  }

  async rewriteArticle(originalArticle, referenceArticles) {
    try {
      console.log(" Starting AI article enhancement...");

      const prompt = this.createRewritePrompt(
        originalArticle,
        referenceArticles
      );

      // Try different providers in order
      const providersToTry = ["huggingFace"];

      for (const providerName of providersToTry) {
        try {
          const provider = this.providers[providerName];
          if (!provider.apiKey) continue;

          console.log(` Trying ${providerName}...`);
          const result = await this.callProvider(provider, prompt);

          if (result && result.content) {
            console.log(` Successfully enhanced article using ${providerName}`);
            return result.content;
          }
        } catch (error) {
          console.log(` ${providerName} failed:`, error.message);
          continue;
        }
      }

      // If  providers fail, use fallback
      console.log("  AI provider failed, using fallback method");
      return this.fallbackRewrite(originalArticle, referenceArticles);
    } catch (error) {
      console.error(" AI rewriting failed:", error);
      return this.fallbackRewrite(originalArticle, referenceArticles);
    }
  }

  async callProvider(provider, prompt) {
    switch (provider) {
      case this.providers.huggingFace:
        return await this.callHuggingFace(provider, prompt);
      default:
        throw new Error("Unsupported provider");
    }
  }

  async callHuggingFace(provider, prompt) {
    const model = provider.models[0];
    const url = `${provider.url}/${model}`;

    const response = await axios.post(
      url,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 1500,
          temperature: 0.7,
          top_p: 0.9,
          repetition_penalty: 1.1,
          do_sample: true,
          return_full_text: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    if (response.data && response.data[0]) {
      return {
        content: response.data[0].generated_text,
        model: model,
        provider: "huggingFace",
      };
    }

    throw new Error("No response from Hugging Face");
  }

  createRewritePrompt(originalArticle, referenceArticles) {
    return `You are an expert content writer and editor. Rewrite the following article to improve its quality, structure, and readability, making it similar to top-ranking articles on Google.

ORIGINAL ARTICLE:
Title: ${originalArticle.title}
Content: ${originalArticle.content.substring(0, 2000)}

REFERENCE ARTICLES (Top-ranking articles on Google):
${referenceArticles
  .map(
    (ref, i) => `
Reference ${i + 1}:
Title: ${ref.title}
Source: ${ref.domain}
Key Points: ${ref.content ? ref.content.substring(0, 500) : ref.snippet}
`
  )
  .join("\n")}

INSTRUCTIONS FOR REWRITING:
1. IMPROVE STRUCTURE:
   - Create a compelling introduction that hooks the reader
   - Use clear headings and subheadings (H2, H3)
   - Organize content in a logical flow
   - Add bullet points or numbered lists where appropriate

2. ENHANCE CONTENT QUALITY:
   - Maintain the original core message and key points
   - Expand on important concepts with more detail
   - Add relevant examples, statistics, or case studies
   - Improve sentence structure and readability
   - Use active voice and concise language

3. OPTIMIZE FOR READABILITY:
   - Keep paragraphs short (3-5 sentences max)
   - Use transition words between paragraphs
   - Break up large blocks of text
   - Add emphasis (bold/italic) for key terms

4. SEO OPTIMIZATION:
   - Include primary and secondary keywords naturally
   - Write compelling meta description
   - Optimize headings for search engines

5. ADD VALUE:
   - Include practical tips or actionable advice
   - Add a "Key Takeaways" section at the end
   - Mention real-world applications

6. CITATIONS:
   - Add a "References" section at the bottom
   - Cite the reference articles properly
   - Include links to the reference articles

FORMAT REQUIREMENTS:
- Start with an engaging title (similar to reference articles)
- Include an introduction that sets context
- Use proper markdown formatting
- End with "References" section
- Do not include any meta-commentary about the rewriting process

IMPORTANT: The rewritten article should be comprehensive, well-structured, and ready for publication. It should be significantly improved from the original while maintaining the core message.

REWRITTEN ARTICLE:`;
  }

  fallbackRewrite(originalArticle, referenceArticles) {
    console.log("🔄 Using fallback rewriting method");

    // Simple enhancement without AI
    const sections = originalArticle.content
      .split("\n\n")
      .filter((p) => p.trim().length > 50);

    let enhancedContent = `# ${originalArticle.title}\n\n`;

    // Introduction
    enhancedContent += `## Introduction\n\n`;
    enhancedContent += `This article explores ${originalArticle.title.toLowerCase()}. Understanding this topic is essential in today's digital landscape.\n\n`;

    // Main content
    sections.forEach((section, index) => {
      enhancedContent += `## Section ${index + 1}\n\n`;
      enhancedContent += `${section}\n\n`;

      // Add bullet points for long paragraphs
      if (section.length > 300) {
        const sentences = section.split(". ").filter((s) => s.length > 20);
        if (sentences.length > 2) {
          enhancedContent += `**Key Points:**\n\n`;
          sentences.slice(0, 3).forEach((sentence) => {
            enhancedContent += `• ${sentence.trim()}\n`;
          });
          enhancedContent += `\n`;
        }
      }
    });

    // Key Takeaways
    enhancedContent += `## Key Takeaways\n\n`;
    enhancedContent += `• Understanding ${originalArticle.title.toLowerCase()} is crucial for success\n`;
    enhancedContent += `• Implementation requires careful planning\n`;
    enhancedContent += `• Continuous learning and adaptation are essential\n\n`;

    // References
    enhancedContent += `## References\n\n`;
    referenceArticles.forEach((ref) => {
      enhancedContent += `• [${ref.title}](${ref.url}) - ${ref.domain}\n`;
    });

    return enhancedContent;
  }
}

module.exports = new AIService();
