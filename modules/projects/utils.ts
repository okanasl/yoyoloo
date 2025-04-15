function generateProjectName(): string {
    const adjectives = [
      "Strategic", "Dynamic", "Innovative", "Global", "Advanced",
      "Digital", "Smart", "Modern", "Efficient", "Agile"
    ];
    
    const nouns = [
      "Initiative", "Solution", "Project", "Venture", "Operation",
      "Framework", "System", "Platform", "Strategy", "Plan"
    ];
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    
    return `${randomAdjective} ${randomNoun} ${randomNumber}`;
  }

  export { generateProjectName }
  