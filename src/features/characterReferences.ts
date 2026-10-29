import type { Node } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { mentions, type Character } from '../domain/book';

export function characterDecorations(doc: Node, characters: Character[]) {
  const decorations: Decoration[] = [];
  doc.descendants((node, position) => {
    if (!node.isTextblock) return;
    // Inline formatting does not split a name. Inline leaves still occupy one position.
    const text = node.textBetween(0, node.content.size, '', '\uFFFC');
    for (const match of mentions(text, characters)) {
      const character = characters.find((c) => c.id === match.characterId)!;
      decorations.push(
        Decoration.inline(position + 1 + match.from, position + 1 + match.to, {
          class: 'character-mention',
          'data-character-id': match.characterId,
          title: 'Open ' + character.name + '’s character card',
        }),
      );
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}
