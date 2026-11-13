import assert from 'node:assert/strict';
import test from 'node:test';
import { unquoteStatement } from './quotes.ts';

test('the quotation marks around a whole statement go, quotations inside it stay', () => {
  assert.equal(unquoteStatement('“Кризис и «отключение чувств» — это не конец”.'), 'Кризис и «отключение чувств» — это не конец.');
  assert.equal(unquoteStatement('“Мозаика “Море внутри”.\n\nНовое значение”.\n'), 'Мозаика “Море внутри”.\n\nНовое значение.\n');
  assert.equal(unquoteStatement('“Սերը հաղթում է ամեն ինչ.”'), 'Սերը հաղթում է ամեն ինչ.');
});

test('a statement that ends without a full stop gets one', () => {
  assert.equal(unquoteStatement('“Земля заботится о тебе”'), 'Земля заботится о тебе.');
  assert.equal(unquoteStatement('“Зачем?”'), 'Зачем?');
});

test('a statement closed early and ended with a stray mark loses all three', () => {
  assert.equal(unquoteStatement('“Про дом.\n\nОбои ‘тогда’.”\n\nТекст зина — бежать”.'), 'Про дом.\n\nОбои ‘тогда’.\n\nТекст зина — бежать.');
});

test('an opening quote that never closes is dropped', () => {
  assert.equal(unquoteStatement('“История: «Когда он был мал, он играл».'), 'История: «Когда он был мал, он играл».');
  assert.equal(unquoteStatement('“Мозаика “Море внутри”'), 'Мозаика “Море внутри”');
});

test('an epigraph and text without wrapping quotes stay as they are', () => {
  const epigraph = '“Нет, никогда, ничей я не был современник.”\n\n(О. Мандельштам)\n\nКаждое окно проживает жизнь.';
  assert.equal(unquoteStatement(epigraph), epigraph);
  assert.equal(unquoteStatement('Мы выбрали «Цвет граната».'), 'Мы выбрали «Цвет граната».');
  assert.equal(unquoteStatement('“Цитата” и наш текст.'), '“Цитата” и наш текст.');
  assert.equal(unquoteStatement(''), '');
});
