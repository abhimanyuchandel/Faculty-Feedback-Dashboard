type LectureEntry = {
  facultyNames: string[];
  lectures: string[];
};

const ENTRIES: LectureEntry[] = [
  {
    facultyNames: ["Hellwig, Lydia", "Lydia Hellwig"],
    lectures: ["Population Health Aspects of Cardiovascular Disorders", "Cardiogenetics"]
  },
  {
    facultyNames: ["Maynes, Elizabeth", "Elizabeth Maynes", "Leighton, Maria", "Maria Leighton"],
    lectures: [
      "Anatomy Pre-Lab 1: Beginning the Chest Part I, II and III",
      "Anatomy Pre-Lab 2: Superior and Middle Mediastinum, Exterior Heart & Coronary Arteries Part I and II",
      "Anatomy Pre-Lab 3: Internal Anatomy of the Heart: Chambers, Valves & Tracts Part I and II"
    ]
  },
  {
    facultyNames: ["Buescher, Teresa", "Teresa Buescher"],
    lectures: [
      "Lab 1 Clinical Correlation: Pneumo/Hemothorax, Penetrating Chest Trauma & Chest Tubes",
      "Lab 2 Clinical Correlation: Phrenic Nerve Injury, Coarctation of the Aorta & Pericardial Tamponade",
      "Lab 3 Clinical Correlation: Cardiac Anatomy and Cardiopulmonary Bypass",
      "Lab 4 Clinical Correlation: Cardiopulmonary Anatomy and Cardiac Plexus",
      "Lab 5 Clinical Correlation: Inhalation Injury"
    ]
  },
  {
    facultyNames: ["Bryant, Howard", "Howard Bryant"],
    lectures: [
      "Introduction to Cardiac Structure & Function",
      "Self Study: Introduction to the Electrocardiogram",
      "Ventricular Function",
      "Starling Curves and PV Loops",
      "Analyzing the ECG",
      "Microvasculature and Local Control of Blood Flow",
      "Overview of the Venous System",
      "Functions of the Venous System",
      "Autonomic Control of Cardiovascular Function and Control of Arterial Blood Pressure",
      "Special Circulations",
      "Introduction to Renal Function",
      "Self Study: Body Fluids Composition & Compartments",
      "Control of Body Fluid Composition-Sodium and Water Balance",
      "Control of Body Fluid Composition-Potassium Homeostasis",
      "Control of Body Fluid Composition-Glucose, Urea, Calcium, Phosphate, Magnesium, & Other Wastes",
      "Control of Body Fluid Composition-Urine Concentrating Mechanism",
      "Histology Lab: Urinary System"
    ]
  },
  {
    facultyNames: ["Granite, Guinevere", "Guinevere Granite"],
    lectures: ["Hemodynamics", "The Cardiac Action Potential", "From the Cardiac Action Potential to the ECG"]
  },
  {
    facultyNames: ["Haigney, Mark", "Mark Haigney"],
    lectures: ["Anatomy Pre-Lab: Posterior Mediastinum"]
  },
  {
    facultyNames: ["Polston, Eva", "Eva Polston"],
    lectures: [
      "Cardiac Auscultation and Heart Sounds",
      "Heart Sounds II: Abnormal Heart Sounds and Murmurs",
      "Arrhythmias",
      "Anti-arrhythmic Drugs",
      "ICR: Syncope",
      "Congestive Heart Failure [CHF]",
      "Positive Inotropic Drugs"
    ]
  },
  {
    facultyNames: ["Dunn-Giroux, Teresa", "Teresa Dunn-Giroux"],
    lectures: ["Cardiovascular System Development Part I and II", "Urinary System Development"]
  },
  {
    facultyNames: ["Dimitrakoff, Jordan", "Jordan Dimitrakoff"],
    lectures: ["Anatomy Pre-Lab 5: Pleurae, Lungs, Bronchi, and Segments"]
  },
  {
    facultyNames: ["Dalgard, Clifton", "Clifton Dalgard"],
    lectures: ["Anatomy Pre-Lab 5: Kidney, Ureter, & Bladder"]
  },
  {
    facultyNames: ["Pollard, Harvey", "Harvey Pollard"],
    lectures: [
      "Introduction to Respiratory Physiology",
      "Ventilation and Perfusion Matching",
      "Respiratory System Regulation",
      "O2 Transport",
      "CO2 Transport",
      "Acid Base Balance Part I and II"
    ]
  },
  {
    facultyNames: ["Vojta, Christopher", "Christopher Vojta", "Pavio, Michael", "Michael Pavio"],
    lectures: [
      "Dynamic Lung Mechanics & Pulmonary Function Testing",
      "Ventilation & Perfusion Matching",
      "Lung Embryology"
    ]
  },
  {
    facultyNames: ["Olsen, Cara", "Cara Olsen"],
    lectures: [
      "Introduction to Radiology and Chest Imaging I",
      "Introduction to Radiology and Chest Imaging II",
      "Introduction to Radiology and Chest Imaging III",
      "Introduction to Radiology and Chest Imaging IV"
    ]
  },
  {
    facultyNames: ["Burklow, Thomas", "Thomas Burklow"],
    lectures: ["Cohort Studies", "Survival Analysis"]
  },
  {
    facultyNames: ["Hughes, Brian", "Brian Hughes", "Hepps, Jennifer", "Jennifer Hepps"],
    lectures: ["Cardiovascular System Developmental Abnormalities Part I and II"]
  },
  {
    facultyNames: ["Frank, Kristi", "Kristi Frank"],
    lectures: ["ICR: Neonatal Transition"]
  },
  {
    facultyNames: [
      "Jaramillo, Couger",
      "Couger Jaramillo",
      "Jimenez-Jaramillo, Couger",
      "Couger Jimenez-Jaramillo"
    ],
    lectures: ["Infectious Endocarditis", "Bacterial Upper Respiratory Infections", "Typical CAP", "Legionella and Pseudomonas"]
  },
  {
    facultyNames: ["Franzos, Alaric", "Alaric Franzos"],
    lectures: ["Cardiac Pathology Part I and II", "Pulmonary Pathology"]
  },
  {
    facultyNames: ["Feng, Ying", "Ying Feng"],
    lectures: ["ICR: Chest Pain", "Pericardial Diseases"]
  },
  {
    facultyNames: ["Muir, Jeannie", "Jeannie Muir"],
    lectures: [
      "Antianginal Drugs",
      "Vasodilator Drugs",
      "Drugs Targeting the Renin/Angiotensin/Aldosterone System",
      "Hypolipidemic Drugs"
    ]
  },
  {
    facultyNames: ["Snow, Andrew", "Andrew Snow"],
    lectures: ["Hypercoagulative Disorders"]
  },
  {
    facultyNames: ["Moores, Lisa", "Lisa Moores"],
    lectures: ["Anticoagulant and Thrombolytic Drugs", "Antiplatelet Drugs"]
  },
  {
    facultyNames: ["Witkop, Catherine", "Catherine Witkop", "Williams, Alan", "Alan Williams"],
    lectures: ["Venous Thromboembolism"]
  },
  {
    facultyNames: ["Kitz, Robert", "Robert Kitz"],
    lectures: ["LHS: Shared Decision-Making Lecture", "Vascular Pathology"]
  },
  {
    facultyNames: ["Day, Regina", "Regina Day"],
    lectures: ["Adrenergics 1 & 2", "Pharmacology of Asthma & COPD"]
  },
  {
    facultyNames: ["Nugent, Fereshteh", "Fereshteh Nugent"],
    lectures: ["Cholinergics, Anticholinergics and Ganglionic Drugs"]
  },
  {
    facultyNames: ["Mehta, Ketan", "Ketan Mehta"],
    lectures: ["Physiology of Shock"]
  },
  {
    facultyNames: ["Watson, Maura", "Maura Watson"],
    lectures: [
      "Approach to Glomerular Disorders",
      "ICR: Acute Kidney Injury",
      "ICR: Chronic Kidney Disease",
      "ICR: Hyponatremia"
    ]
  },
  {
    facultyNames: ["Michel, Chloe", "Chloe Michel"],
    lectures: [
      "Nephrolithiasis Presentation, Dx, Rx, & Types",
      "Mechanical Urinary Tract Disorders",
      "Urologic Trauma"
    ]
  },
  {
    facultyNames: ["Jerse, Ann", "Ann Jerse"],
    lectures: ["Urinary Tract Infections"]
  },
  {
    facultyNames: ["Parker, Lynette", "Lynette Parker"],
    lectures: ["Renal Pathology Part I and II"]
  },
  {
    facultyNames: ["Mattapallil, Joseph", "Joseph Mattapallil"],
    lectures: ["Viral Upper Respiratory Infections"]
  },
  {
    facultyNames: ["Laing, Eric", "Eric Laing"],
    lectures: ["Influenza"]
  },
  {
    facultyNames: ["Liechti, George", "George Liechti"],
    lectures: ["Atypical CAP"]
  },
  {
    facultyNames: ["Mitre, Edward", "Edward Mitre"],
    lectures: ["Pulmonary Tuberculosis", "Endemic Mycoses"]
  },
  {
    facultyNames: ["Fabyan, Kimberly", "Kimberly Fabyan"],
    lectures: ["Pulmonary Function Testing", "Obstructive Lung Disease/Bronchiectasis"]
  },
  {
    facultyNames: ["Chandel, Abhimanyu", "Abhimanyu Chandel"],
    lectures: ["Pulmonary Hypertension"]
  },
  {
    facultyNames: ["Elliott, Brian", "Brian Elliott"],
    lectures: ["Restrictive Lung Disease"]
  },
  {
    facultyNames: ["Bunin, Jessica", "Jessica Bunin"],
    lectures: ["Pulmonary Edema and Acute Lung Injury"]
  },
  {
    facultyNames: ["Collen, Jacob", "Jacob Collen"],
    lectures: ["Hypoxemia and Respiratory Failure Part I-V"]
  },
  {
    facultyNames: ["Stewart, Ian", "Ian Stewart"],
    lectures: ["ICR: Acid-Base"]
  },
  {
    facultyNames: ["Curtis, Griffith", "Griffith Curtis"],
    lectures: ["Hypertension", "ICR: Approach to Cough", "ICR: Approach to Dyspnea"]
  },
  {
    facultyNames: ["Kortum, Rob", "Rob Kortum"],
    lectures: ["Diuretic Drugs"]
  },
  {
    facultyNames: ["Klein, Michael", "Michael Klein"],
    lectures: ["Heart Mechanics"]
  },
  {
    facultyNames: ["Verplank, Jordan", "Jordan VerPlank", "Jordan Verplank"],
    lectures: ["Spirometry, Lung Volumes and Static Lung Mechanics"]
  },
  {
    facultyNames: ["Smyth, Jeremy", "Jeremy Smyth"],
    lectures: ["Histology Lab: Circulatory System", "Histology Lab: Respiratory System"]
  }
];

function normalizeName(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

const lecturesByFacultyKey = new Map<string, string[]>();
for (const entry of ENTRIES) {
  for (const rawName of entry.facultyNames) {
    lecturesByFacultyKey.set(normalizeName(rawName), unique(entry.lectures));
  }
}

export function getFoundationsLecturesForFaculty(firstName: string, lastName: string) {
  const candidates = [
    `${lastName}, ${firstName}`,
    `${firstName} ${lastName}`,
    `${lastName} ${firstName}`
  ];

  for (const candidate of candidates) {
    const found = lecturesByFacultyKey.get(normalizeName(candidate));
    if (found && found.length) {
      return found;
    }
  }

  return getAllFoundationsLectures();
}

export function getAllFoundationsLectures() {
  const values = ENTRIES.flatMap((entry) => entry.lectures);
  return unique(values).sort((a, b) => a.localeCompare(b));
}

