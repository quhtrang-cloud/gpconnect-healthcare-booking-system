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