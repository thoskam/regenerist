// Condition rules text.
//
// Source: D&D System Reference Document 5.1 wording, © Wizards of the Coast LLC, CC BY 4.0
// (https://creativecommons.org/licenses/by/4.0/), via github.com/adkinn/srd-5.2.1 → Open5e (document wotc-srd).
// That dataset is labelled 5.2.1 but carries the 2014-era wording. The 2024 exhaustion summary below is our own.

export const CONDITION_NAMES = ["Blinded", "Charmed", "Deafened", "Frightened", "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious"] as const

export const CONDITION_TEXT: Record<string, string> = {
  "Blinded": "• A blinded creature can't see and automatically fails any ability check that requires sight.\n• Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
  "Charmed": "• A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.\n• The charmer has advantage on any ability check to interact socially with the creature.",
  "Deafened": "• A deafened creature can't hear and automatically fails any ability check that requires hearing.",
  "Frightened": "• A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.\n• The creature can't willingly move closer to the source of its fear.",
  "Grappled": "• A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed.\n• The condition ends if the grappler is incapacitated (see the condition).\n• The condition also ends if an effect removes the grappled creature from the reach of the grappler or grappling effect, such as when a creature is hurled away by the *thunder-wave• spell.",
  "Incapacitated": "• An incapacitated creature can't take actions or reactions.",
  "Invisible": "• An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured. The creature's location can be detected by any noise it makes or any tracks it leaves.\n• Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage.",
  "Paralyzed": "• A paralyzed creature is incapacitated (see the condition) and can't move or speak.\n• The creature automatically fails Strength and Dexterity saving throws.\n• Attack rolls against the creature have advantage.\n• Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
  "Petrified": "• A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging.\n• The creature is incapacitated (see the condition), can't move or speak, and is unaware of its surroundings.\n• Attack rolls against the creature have advantage.\n• The creature automatically fails Strength and Dexterity saving throws.\n• The creature has resistance to all damage.\n• The creature is immune to poison and disease, although a poison or disease already in its system is suspended, not neutralized.",
  "Poisoned": "• A poisoned creature has disadvantage on attack rolls and ability checks.",
  "Prone": "• A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition.\n• The creature has disadvantage on attack rolls.\n• An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.",
  "Restrained": "• A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed.\n• Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.\n• The creature has disadvantage on Dexterity saving throws.",
  "Stunned": "• A stunned creature is incapacitated (see the condition), can't move, and can speak only falteringly.\n• The creature automatically fails Strength and Dexterity saving throws.\n• Attack rolls against the creature have advantage.",
  "Unconscious": "• An unconscious creature is incapacitated (see the condition), can't move or speak, and is unaware of its surroundings\n• The creature drops whatever it's holding and falls prone.\n• The creature automatically fails Strength and Dexterity saving throws.\n• Attack rolls against the creature have advantage.\n• Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
  "Exhaustion (2014)": "Effects are cumulative:\n1 — Disadvantage on ability checks\n2 — Speed halved\n3 — Disadvantage on attack rolls and saving throws\n4 — Hit point maximum halved\n5 — Speed reduced to 0\n6 — Death\nFinishing a long rest with food and drink removes one level.",
  "Exhaustion (2024)": "• Each level of exhaustion gives a −2 penalty to every d20 test (ability checks, attack rolls, saving throws) and reduces your speed by 5 feet per level.\n• Finishing a long rest removes one level.\n• You die at level 6."
}
