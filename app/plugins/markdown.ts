import MarkdownIt from "markdown-it";
import MarkdownItAttrs from "markdown-it-attrs";
import MarkdownItDiv from "markdown-it-div";

export default defineNuxtPlugin(() => {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
  md.use(MarkdownItAttrs);
  md.use(MarkdownItDiv);

  return {
    provide: {
      md,
    },
  };
});
