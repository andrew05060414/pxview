import fs from 'fs';
import path from 'path';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Animated, StyleSheet, View } from 'react-native';
import PXThumbnail from '../PXThumbnail';
import PXThumbnailTouchable from '../PXThumbnailTouchable';
import Loader from '../Loader';

jest.mock('../PXImage', () => {
  const ReactLib = require('react');
  return (props) => ReactLib.createElement('MockPXImage', props);
});

const repoRoot = path.resolve(__dirname, '../../..');

const walkJsFiles = (dir) => {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name === '__tests__') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
};

describe('v6.0.2 library upgrade regressions', () => {
  test('PXThumbnail renders 30x30 circular style when size prop is omitted under React 19', () => {
    let tree;
    act(() => {
      tree = renderer.create(<PXThumbnail uri="https://example.com/avatar.jpg" />);
    });

    const container = tree.root.findByType(View);
    const containerStyle = StyleSheet.flatten(container.props.style);
    expect(containerStyle.width).toBe(30);
    expect(containerStyle.height).toBe(30);
    expect(containerStyle.borderRadius).toBe(15);

    const image = tree.root.findByType('MockPXImage');
    const imageStyle = StyleSheet.flatten(image.props.style);
    expect(imageStyle.width).toBe(30);
    expect(imageStyle.height).toBe(30);
    expect(imageStyle.borderRadius).toBe(15);
  });

  test('PXThumbnailTouchable forwards default size=30 when size prop is omitted under React 19', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <PXThumbnailTouchable uri="https://example.com/comment-avatar.jpg" />,
      );
    });

    const thumbnail = tree.root.findByType(PXThumbnail);
    expect(thumbnail.props.size).toBe(30);

    const image = tree.root.findByType('MockPXImage');
    const imageStyle = StyleSheet.flatten(image.props.style);
    expect(imageStyle.width).toBe(30);
    expect(imageStyle.height).toBe(30);
    expect(imageStyle.borderRadius).toBe(15);
  });

  test('Loader renders ThreeBounce dots with visible fallback color and full-bleed absolutePosition', () => {
    let tree;
    act(() => {
      tree = renderer.create(<Loader absolutePosition />);
    });

    const dots = tree.root.findAll(
      (node) =>
        node.type === Animated.View &&
        node.props &&
        node.props.testID === 'loader-dot',
    );
    expect(dots).toHaveLength(3);
    dots.forEach((dot) => {
      const dotStyle = StyleSheet.flatten(dot.props.style);
      expect(dotStyle.backgroundColor).toBeTruthy();
      expect(dotStyle.backgroundColor).not.toBe('#fff');
      expect(dotStyle.width).toBe(10);
      expect(dotStyle.height).toBe(10);
    });

    const rootView = tree.root.findAllByType(View)[0];
    const rootStyle = StyleSheet.flatten(rootView.props.style);
    expect(rootStyle).toMatchObject({
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    });
  });

  test('all icon usages across src/ exist in react-native-vector-icons v10 glyphmaps without md-/ios- prefixes', () => {
    const glyphDir = path.join(
      repoRoot,
      'node_modules',
      'react-native-vector-icons',
      'glyphmaps',
    );
    const glyphmaps = {};
    for (const file of fs.readdirSync(glyphDir)) {
      if (file.endsWith('.json')) {
        glyphmaps[file.slice(0, -5)] = new Set(
          Object.keys(
            JSON.parse(fs.readFileSync(path.join(glyphDir, file), 'utf8')),
          ),
        );
      }
    }

    const familyMap = {
      ionicon: 'Ionicons',
      'font-awesome': 'FontAwesome',
      material: 'MaterialIcons',
      'material-community': 'MaterialCommunityIcons',
      entypo: 'Entypo',
      feather: 'Feather',
    };

    const srcFiles = walkJsFiles(path.join(repoRoot, 'src'));
    const missingIcons = [];
    const legacyPrefixed = [];

    for (const filePath of srcFiles) {
      const rel = path.relative(repoRoot, filePath);
      const txt = fs.readFileSync(filePath, 'utf8');

      const importRe = /import\s+(\w+)\s+from\s+['"]react-native-vector-icons\/(\w+)['"]/g;
      const localIcons = {};
      let match;
      while ((match = importRe.exec(txt)) !== null) {
        localIcons[match[1]] = match[2];
      }

      for (const [alias, family] of Object.entries(localIcons)) {
        const gset = glyphmaps[family] || new Set();
        const tagRe = new RegExp(
          `<${alias}\\b[^>]*?\\bname=(?:\\{([^}]+)\\}|['"]([^'"]+)['"])`,
          'gs',
        );
        while ((match = tagRe.exec(txt)) !== null) {
          const expr = match[1] || `'${match[2]}'`;
          const litRe = /['"]([a-z0-9-]+)['"]/g;
          let litMatch;
          while ((litMatch = litRe.exec(expr)) !== null) {
            if (!gset.has(litMatch[1])) {
              missingIcons.push(`${rel}: ${family}:${litMatch[1]}`);
            }
          }
        }
      }

      const iconTypeRe = /\biconName=['"]([^'"]+)['"][^>]*?\biconType=['"]([^'"]+)['"]|\biconType=['"]([^'"]+)['"][^>]*?\biconName=['"]([^'"]+)['"]/gs;
      while ((match = iconTypeRe.exec(txt)) !== null) {
        const iname = match[1] || match[4];
        const itype = match[2] || match[3];
        const family = familyMap[itype] || itype;
        if (glyphmaps[family] && !glyphmaps[family].has(iname)) {
          missingIcons.push(`${rel}: ${family}(${itype}):${iname}`);
        }
      }

      const paperIconRe = /\bicon=['"]([a-z0-9-]+)['"]/g;
      while ((match = paperIconRe.exec(txt)) !== null) {
        if (!glyphmaps.MaterialCommunityIcons.has(match[1])) {
          missingIcons.push(`${rel}: Paper/MCI:${match[1]}`);
        }
      }

      const legacyPrefixRe = /['"]((?:md|ios)-[a-z0-9-]+)['"]/g;
      while ((match = legacyPrefixRe.exec(txt)) !== null) {
        legacyPrefixed.push(`${rel}: ${match[1]}`);
      }
    }

    expect(missingIcons).toEqual([]);
    expect(legacyPrefixed).toEqual([]);
  });

  test('enforces React 19 function component, RN 0.87 StyleSheet, Paper v5 MD2 Button/Theme, and BootSplash blue contracts', () => {
    const srcFiles = walkJsFiles(path.join(repoRoot, 'src'));
    const functionDefaultProps = [];
    const legacyButtonProps = [];
    const removedAbsoluteFillObject = [];

    for (const filePath of srcFiles) {
      const rel = path.relative(repoRoot, filePath);
      const txt = fs.readFileSync(filePath, 'utf8');
      const isClass = /class\s+\w+\s+extends\s+/.test(txt);
      if (!isClass && txt.includes('defaultProps')) {
        functionDefaultProps.push(rel);
      }
      if (txt.includes('absoluteFillObject')) {
        removedAbsoluteFillObject.push(rel);
      }

      const btnRe = /<Button\b([^>]*?)>/gs;
      let match;
      while ((match = btnRe.exec(txt)) !== null) {
        const attrs = match[1];
        if (/\bcolor=/.test(attrs) || /\bprimary\b/.test(attrs)) {
          legacyButtonProps.push(`${rel}: <Button ${attrs.replace(/\s+/g, ' ').trim()}>`);
        }
      }
    }

    expect(functionDefaultProps).toEqual([]);
    expect(legacyButtonProps).toEqual([]);
    expect(removedAbsoluteFillObject).toEqual([]);

    const appJs = fs.readFileSync(
      path.join(repoRoot, 'src', 'screens', 'App', 'App.js'),
      'utf8',
    );
    expect(appJs).toContain('MD2LightTheme');
    expect(appJs).toContain('MD2DarkTheme');
    expect(appJs).not.toContain('MD3DarkTheme');

    const illustItemJs = fs.readFileSync(
      path.join(repoRoot, 'src', 'components', 'IllustItem.js'),
      'utf8',
    );
    expect(illustItemJs).toContain('MD2DarkTheme');
    expect(illustItemJs).not.toContain('MD3DarkTheme');

    const colorsXml = fs.readFileSync(
      path.join(
        repoRoot,
        'android',
        'app',
        'src',
        'main',
        'res',
        'values',
        'colors.xml',
      ),
      'utf8',
    );
    expect(colorsXml).toContain('#2e97d8');
    expect(colorsXml).not.toContain('#26a599');
  });
});
