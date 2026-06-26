import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveEffectivePaymentMethod, getDocumentKindForPaymentMethod } from './paymentMethodResolver.mjs';

test('prefers final payment method over the participant payment method', () => {
  const row = {
    finalPaymentMethod: 'SkillsFuture',
    paymentMethod: 'Cash',
  };

  assert.equal(resolveEffectivePaymentMethod(row), 'SkillsFuture');
  assert.equal(getDocumentKindForPaymentMethod(row), 'invoice');
});

test('uses nested course details when the row itself has no payment method fields', () => {
  const row = {
    course: {
      finalPaymentMethod: 'PayNow',
      paymentMethod: 'Cash',
    },
  };

  assert.equal(resolveEffectivePaymentMethod(row), 'PayNow');
  assert.equal(getDocumentKindForPaymentMethod(row), 'receipt');
});
