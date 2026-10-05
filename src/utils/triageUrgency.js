function triageUrgency({
  symptom_category,
  symptom_duration,
  red_flags,
}) {

const isSelected = value => value === true || value === 'true';

const hasRedFlags = [
  red_flags?.severe_pain,
  red_flags?.breathing,
  red_flags?.high_fever,
  red_flags?.other,
].some(isSelected);

  if (hasRedFlags) {
    return 'Urgent';
  }

  if (symptom_category === 'Fever' && symptom_duration === '<1 day') {
    return 'Urgent';
  }

  if (
    ['Pain', 'Fever', 'Respiratory', 'Digestive'].includes(symptom_category) &&
    ['<1 day', '1-3 days'].includes(symptom_duration)
  ) {
    return 'Soon';
  }

  return 'Routine';
}

module.exports = triageUrgency;