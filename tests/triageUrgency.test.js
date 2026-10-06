const triageUrgency = require('../src/utils/triageUrgency');

test('does not treat string "false" flags as active red flags', () => {
  const result = triageUrgency({
    symptom_category: 'Other',
    symptom_duration: '>3 days',
    red_flags: {
      severe_pain: 'false',
      breathing: 'false',
      high_fever: 'false',
      other: 'false',
    },
  });

  expect(result).toBe('Routine');
});

test.each([true, 'true'])(
  'returns Urgent when severe_pain is %p',
  value => {
    const result = triageUrgency({
      symptom_category: 'Other',
      symptom_duration: '>3 days',
      red_flags: {
        severe_pain: value,
        breathing: false,
        high_fever: false,
        other: false,
      },
    });

    expect(result).toBe('Urgent');
  }
);

test('returns Routine when all red flags are boolean false', () => {
  const result = triageUrgency({
    symptom_category: 'Other',
    symptom_duration: '>3 days',
    red_flags: {
      severe_pain: false,
      breathing: false,
      high_fever: false,
      other: false,
    },
  });

  expect(result).toBe('Routine');
});

test('returns Routine when red_flags is omitted', () => {
  const result = triageUrgency({
    symptom_category: 'Other',
    symptom_duration: '>3 days',
  });

  expect(result).toBe('Routine');
});

test('returns Urgent for Fever lasting less than one day', () => {
  const result = triageUrgency({
    symptom_category: 'Fever',
    symptom_duration: '<1 day',
    red_flags: {},
  });

  expect(result).toBe('Urgent');
});

test('returns Soon for Pain lasting one to three days', () => {
  const result = triageUrgency({
    symptom_category: 'Pain',
    symptom_duration: '1-3 days',
    red_flags: {},
  });

  expect(result).toBe('Soon');
});

test.each([
  ['breathing', true],
  ['breathing', 'true'],
  ['high_fever', true],
  ['high_fever', 'true'],
  ['other', true],
  ['other', 'true'],
])('returns Urgent when %s is %p', (flag, value) => {
  const result = triageUrgency({
    symptom_category: 'Other',
    symptom_duration: '>3 days',
    red_flags: {
      severe_pain: false,
      breathing: false,
      high_fever: false,
      other: false,
      [flag]: value,
    },
  });

  expect(result).toBe('Urgent');
});