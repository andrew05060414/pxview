# Novel Inline Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Pixiv novel inline image markers render as images in the existing reader flow without regressing current novel-reader behavior.

**Architecture:** Keep the current `pixiv.novelWebview -> parseNovelText -> NovelViewer` pipeline. Extend the parser to emit an inline image node, add a thin image-resolution helper, and teach `NovelViewer` to render the node inside the existing page flow with graceful fallback behavior.

**Tech Stack:** React Native 0.63.5, React 16.13.1, Redux, Redux Saga, `react-native-htmlview`, Jest 25

---

### Task 1: Parser And Inline Image Metadata

**Files:**
- Create: `__tests__/helpers/novelTextParser.spec.js`
- Create: `src/common/helpers/novelInlineImage.js`
- Modify: `src/common/helpers/novelTextParser.js`

- [ ] **Step 1: Write the failing parser test**

```javascript
import parseNovelText from '../../src/common/helpers/novelTextParser';

describe('parseNovelText inline images', () => {
  it('converts loadedimage markup into a px-image node', () => {
    const result = parseNovelText('before[loadedimage:24095674]after');

    expect(result).toEqual([
      "before<px-image data-illust-id='24095674'></px-image>after",
    ]);
  });

  it('keeps newpage behavior when image markers are present', () => {
    const result = parseNovelText('one[loadedimage:24095674][newpage]two');

    expect(result).toEqual([
      "one<px-image data-illust-id='24095674'></px-image>",
      'two',
    ]);
  });
});
```

- [ ] **Step 2: Run the parser test to verify it fails**

Run: `npm test -- --runInBand __tests__/helpers/novelTextParser.spec.js`

Expected: FAIL because `parseNovelText` currently leaves the marker as raw text or ignores it entirely.

- [ ] **Step 3: Add the minimal inline-image helper**

```javascript
export const createInlineImageTag = (illustId) =>
  `<px-image data-illust-id='${illustId}'></px-image>`;

export const getInlineImageIdFromNode = (node) =>
  node && node.attribs ? node.attribs['data-illust-id'] : null;
```

- [ ] **Step 4: Extend the parser to emit inline image tags**

```javascript
import { Parser as NovelParser } from 'pixiv-novel-parser';
import { createInlineImageTag } from './novelInlineImage';

// inside the existing tag-handling branch
} else if (p.name === 'loadedimage') {
  text += createInlineImageTag(String(p.id || p.illustId || p.imageId));
} else if (p.name === 'newpage') {
```

If the actual parser payload uses a different property name, update the test fixture and implementation together to match the real `pixiv-novel-parser` output.

- [ ] **Step 5: Run the parser test to verify it passes**

Run: `npm test -- --runInBand __tests__/helpers/novelTextParser.spec.js`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add __tests__/helpers/novelTextParser.spec.js src/common/helpers/novelInlineImage.js src/common/helpers/novelTextParser.js
git commit -m "feat: parse novel inline image markers"
```

### Task 2: Inline Image Rendering In NovelViewer

**Files:**
- Create: `__tests__/components/NovelViewer.spec.js`
- Create: `src/components/NovelInlineImage.js`
- Modify: `src/components/NovelViewer.js`

- [ ] **Step 1: Write the failing viewer test**

```javascript
import React from 'react';
import renderer from 'react-test-renderer';
import NovelViewer from '../../src/components/NovelViewer';

describe('NovelViewer inline images', () => {
  it('renders inline image nodes inside the page flow', () => {
    const tree = renderer
      .create(
        <NovelViewer
          novelId={1}
          items={["before<px-image data-illust-id='24095674'></px-image>after"]}
          index={0}
          fontSize={16}
          lineHeight={1.6}
          onIndexChange={() => {}}
          onPressPageLink={() => {}}
        />,
      )
      .toJSON();

    expect(JSON.stringify(tree)).toContain('24095674');
  });
});
```

- [ ] **Step 2: Run the viewer test to verify it fails**

Run: `npm test -- --runInBand __tests__/components/NovelViewer.spec.js`

Expected: FAIL because `NovelViewer` does not currently recognize `px-image` nodes.

- [ ] **Step 3: Add a focused inline-image component**

```javascript
import React, { useMemo, useState } from 'react';
import { View, Image } from 'react-native';
import { Text } from 'react-native-paper';

const NovelInlineImage = ({ illustId, resolveImageUrl }) => {
  const [failed, setFailed] = useState(false);
  const uri = useMemo(() => resolveImageUrl(illustId), [illustId, resolveImageUrl]);

  if (!uri || failed) {
    return <Text>{'图片加载失败'}</Text>;
  }

  return (
    <View>
      <Image
        source={{ uri }}
        resizeMode="contain"
        style={{ width: '100%', aspectRatio: 1 }}
        onError={() => setFailed(true)}
      />
    </View>
  );
};

export default NovelInlineImage;
```

Use a deterministic `resolveImageUrl` prop instead of hiding network fetch logic inside the component.

- [ ] **Step 4: Wire `NovelViewer` to render `px-image` nodes**

```javascript
import NovelInlineImage from './NovelInlineImage';
import { getInlineImageIdFromNode } from '../common/helpers/novelInlineImage';

handleRenderNode = (node, index, siblings, parent, defaultRenderer) => {
  if (node.name === 'px-image') {
    const illustId = getInlineImageIdFromNode(node);
    return (
      <NovelInlineImage
        key={index}
        illustId={illustId}
        resolveImageUrl={this.resolveInlineImageUrl}
      />
    );
  }

  // existing chapter and jump logic stays below
};
```

Add `resolveInlineImageUrl` in `NovelViewer` as the thinnest possible adapter that turns an illustration ID into a display URL. If that turns out to require async state instead of a pure function, move the resolution state into `NovelInlineImage` but keep the network logic isolated from the rest of the viewer.

- [ ] **Step 5: Run the viewer test to verify it passes**

Run: `npm test -- --runInBand __tests__/components/NovelViewer.spec.js`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add __tests__/components/NovelViewer.spec.js src/components/NovelInlineImage.js src/components/NovelViewer.js src/common/helpers/novelInlineImage.js
git commit -m "feat: render inline images in novel viewer"
```

### Task 3: Regression Coverage And Reader Hardening

**Files:**
- Modify: `__tests__/helpers/novelTextParser.spec.js`
- Modify: `__tests__/components/NovelViewer.spec.js`
- Modify: `src/components/NovelViewer.js`

- [ ] **Step 1: Add failing regression tests for legacy reader behavior**

```javascript
it('still renders chapter nodes', () => {
  const tree = renderer
    .create(
      <NovelViewer
        novelId={1}
        items={['<chapter>Title</chapter>body']}
        index={0}
        fontSize={16}
        lineHeight={1.6}
        onIndexChange={() => {}}
        onPressPageLink={() => {}}
      />,
    )
    .toJSON();

  expect(JSON.stringify(tree)).toContain('Title');
});

it('still renders jump links', () => {
  const onPressPageLink = jest.fn();
  const instance = renderer.create(
    <NovelViewer
      novelId={1}
      items={["<jump page='2'>2ページへ</jump>"]}
      index={0}
      fontSize={16}
      lineHeight={1.6}
      onIndexChange={() => {}}
      onPressPageLink={onPressPageLink}
    />,
  );

  expect(instance.toJSON()).toBeTruthy();
});
```

- [ ] **Step 2: Run the targeted test suite**

Run: `npm test -- --runInBand __tests__/helpers/novelTextParser.spec.js __tests__/components/NovelViewer.spec.js`

Expected: FAIL if inline-image changes regressed existing node handling or still miss fallback behavior.

- [ ] **Step 3: Harden the viewer for fallback and layout**

```javascript
<NovelInlineImage
  key={index}
  illustId={illustId}
  resolveImageUrl={this.resolveInlineImageUrl}
  maxWidth={globalStyleVariables.WINDOW_WIDTH - 20}
/>
```

```javascript
if (node.name === 'chapter') {
  // existing chapter rendering
}
if (node.name === 'jump') {
  // existing jump rendering
}
if (node.name === 'px-image') {
  // inline image rendering
}
```

Keep the existing custom-node order explicit so inline images do not accidentally shadow chapter or jump behavior.

- [ ] **Step 4: Run the targeted suite again**

Run: `npm test -- --runInBand __tests__/helpers/novelTextParser.spec.js __tests__/components/NovelViewer.spec.js`

Expected: PASS

- [ ] **Step 5: Run the full current Jest suite**

Run: `npm test -- --runInBand`

Expected: PASS for the existing auth saga test plus the new parser/viewer tests.

- [ ] **Step 6: Commit**

```bash
git add __tests__/helpers/novelTextParser.spec.js __tests__/components/NovelViewer.spec.js src/components/NovelViewer.js src/components/NovelInlineImage.js
git commit -m "test: cover novel inline image regressions"
```
