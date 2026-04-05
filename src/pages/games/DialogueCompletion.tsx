// src/pages/games/DialogueCompletion.tsx
import React, { useState, useMemo, useEffect } from "react";
import { generateGameContent } from "./gameAI";
import { ArrowLeft, RefreshCw, Trophy, Clock, ChevronRight, MessageSquare, User } from "lucide-react";

interface GameConfig { topic: string; difficulty: string; duration: number; }
interface Props { config: GameConfig; onBack: () => void; }

interface DialogueLine { speaker: "A"|"B"; text: string; isBlank?: boolean; options?: string[]; correct?: string; explanation?: string; }
interface Dialogue { title: string; context: string; lines: DialogueLine[]; }

function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }

const ALL_DIALOGUES: Record<string, Record<string, Dialogue[]>> = {
  "Daily Life": {
    beginner: [
      { title:"Asking a Neighbour for Help", context:"Two neighbours are talking in the hallway.", lines:[{speaker:"A",text:"Hi! Could you help me with something?"},{speaker:"B",text:"Sure! What do you need?"},{speaker:"A",text:"I need to carry some boxes upstairs.",isBlank:true,options:["Can you give me a hand?","Do you want to eat?","Are you going to work?","Can I borrow your car?"],correct:"Can you give me a hand?",explanation:"'Give me a hand' means to help someone."},{speaker:"B",text:"Of course! Happy to help."}]},
      { title:"Making Weekend Plans", context:"Friends are planning the weekend.", lines:[{speaker:"A",text:"What are you doing this weekend?"},{speaker:"B",text:"I'm not sure yet.",isBlank:true,options:["Do you have any suggestions?","I am very busy.","I hate weekends.","I don't have a car."],correct:"Do you have any suggestions?",explanation:"Asking for ideas politely after saying you're unsure."},{speaker:"A",text:"How about the farmers market on Saturday?"},{speaker:"B",text:"That sounds great! What time?"}]},
      { title:"Asking About a Package", context:"A resident asks their building manager about a delivery.", lines:[{speaker:"A",text:"Excuse me, did a package arrive for apartment 4B?"},{speaker:"B",text:"Let me check. Yes, it came this morning.",isBlank:true,options:["Great! Where can I pick it up?","I don't care.","Send it back please.","Is it expensive?"],correct:"Great! Where can I pick it up?",explanation:"Natural follow-up after being told a package arrived."},{speaker:"B",text:"It's at the front desk. Bring your ID."}]},
      { title:"Borrowing Something", context:"Asking a friend to borrow a tool.", lines:[{speaker:"A",text:"I'm trying to hang a picture but I don't have a drill."},{speaker:"B",text:"Oh, I have one.",isBlank:true,options:["Would you mind if I borrowed it?","Can I have it forever?","Do you want money?","I'll buy my own."],correct:"Would you mind if I borrowed it?",explanation:"'Would you mind if I borrowed…' is a polite way to ask."},{speaker:"B",text:"Not at all! I'll bring it over later."}]},
    ],
    intermediate: [
      { title:"Discussing a Problem at Home", context:"Talking to a landlord about a repair issue.", lines:[{speaker:"A",text:"Hello, I'm calling about a problem in my apartment."},{speaker:"B",text:"Of course. What seems to be the issue?"},{speaker:"A",text:"The heating has not been working for two days.",isBlank:true,options:["Could someone come to look at it?","I want to move out.","Please send me a bill.","Do you like the weather?"],correct:"Could someone come to look at it?",explanation:"Polite way to request a repair visit."},{speaker:"B",text:"Absolutely. I'll send a technician tomorrow."}]},
      { title:"Resolving a Neighbour Conflict", context:"Two neighbours discuss a noise issue.", lines:[{speaker:"A",text:"I hope you don't mind me mentioning this."},{speaker:"B",text:"Not at all. What's on your mind?"},{speaker:"A",text:"The music last night was quite loud.",isBlank:true,options:["I was wondering if we could come to an agreement.","You are a terrible neighbour.","I will call the police next time.","Can you move away?"],correct:"I was wondering if we could come to an agreement.",explanation:"Diplomatic phrasing to resolve a conflict respectfully."},{speaker:"B",text:"I'm so sorry. I'll be more careful from now on."}]},
      { title:"Planning a Home Renovation", context:"A couple discusses renovating their kitchen.", lines:[{speaker:"A",text:"The kitchen really needs to be updated."},{speaker:"B",text:"I agree. Where should we start?"},{speaker:"A",text:"The appliances are old and the cabinets are worn out.",isBlank:true,options:["I think we should get a few quotes before deciding.","Let's buy everything immediately.","The kitchen is fine actually.","I'll do it all myself."],correct:"I think we should get a few quotes before deciding.",explanation:"Getting quotes is the practical first step — shows planning."},{speaker:"B",text:"Good idea. We should set a realistic budget too."}]},
    ],
    advanced: [
      { title:"Discussing a Community Issue", context:"At a neighbourhood meeting about parking.", lines:[{speaker:"A",text:"I'd like to bring up the parking situation on Elm Street."},{speaker:"B",text:"Several residents have mentioned that."},{speaker:"A",text:"The problem has gotten significantly worse since the new building opened.",isBlank:true,options:["I propose we petition the city for dedicated resident parking.","I think we should all buy bikes.","Let's just ignore it.","We should move to a different neighbourhood."],correct:"I propose we petition the city for dedicated resident parking.",explanation:"'I propose' introduces a formal, constructive suggestion in a meeting."},{speaker:"B",text:"A constructive idea. Shall we put it to a vote?"}]},
      { title:"Negotiating a Lease Renewal", context:"A tenant discusses lease terms with a landlord.", lines:[{speaker:"A",text:"My lease is coming up for renewal next month."},{speaker:"B",text:"Yes, I was going to contact you. We were considering a ten percent increase."},{speaker:"A",text:"I appreciate the notice. I've been a reliable tenant for three years with no late payments.",isBlank:true,options:["I was hoping we could negotiate a more modest increase given my track record.","I will simply leave if you increase the rent.","Ten percent sounds fine, I'll take it.","I refuse to discuss this."],correct:"I was hoping we could negotiate a more modest increase given my track record.",explanation:"Using your positive history as leverage in a negotiation — professional and effective."},{speaker:"B",text:"That's fair. Let's discuss what works for both of us."}]},
    ],
  },
  "Work": {
    beginner: [
      { title:"Asking for a Day Off", context:"An employee speaks to their manager.", lines:[{speaker:"A",text:"Excuse me, do you have a moment?"},{speaker:"B",text:"Sure, what's on your mind?"},{speaker:"A",text:"I was wondering if I could take Friday off.",isBlank:true,options:["I have a family commitment that day.","I don't like working.","Fridays are boring.","I want to sleep in."],correct:"I have a family commitment that day.",explanation:"Giving a professional reason makes the request more credible."},{speaker:"B",text:"That should be fine. Just ensure your tasks are covered."}]},
      { title:"Asking a Colleague for Help", context:"Two co-workers in the office.", lines:[{speaker:"A",text:"Are you busy right now?"},{speaker:"B",text:"Not particularly. What do you need?"},{speaker:"A",text:"I'm struggling with the formatting in this spreadsheet.",isBlank:true,options:["Could you show me how to fix it?","You should do it for me.","I'll just leave it as it is.","Call IT."],correct:"Could you show me how to fix it?",explanation:"Asking to be shown how is more empowering than asking someone to do it for you."},{speaker:"B",text:"Of course. Pull up the file and I'll walk you through it."}]},
    ],
    intermediate: [
      { title:"Discussing a Project Delay", context:"A team member updates the project manager.", lines:[{speaker:"A",text:"I need to update you on the Henderson project."},{speaker:"B",text:"Go ahead."},{speaker:"A",text:"We hit an unexpected issue with the data migration.",isBlank:true,options:["We may need to push the deadline by a few days.","I quit my job.","Let's cancel the project.","I forgot about it."],correct:"We may need to push the deadline by a few days.",explanation:"Framing bad news professionally with a specific, manageable request."},{speaker:"B",text:"Can you send me a revised timeline by end of day?"}]},
      { title:"Requesting Feedback", context:"An employee asks their manager for guidance.", lines:[{speaker:"A",text:"Do you have a few minutes to give me feedback on my presentation?"},{speaker:"B",text:"Sure. Overall it was good, but the data section was a little hard to follow."},{speaker:"A",text:"I see. I'll simplify those slides.",isBlank:true,options:["Could you give me a specific example of what was unclear?","I thought it was perfect.","I disagree completely.","Should I just delete that section?"],correct:"Could you give me a specific example of what was unclear?",explanation:"Asking for a specific example helps you improve more effectively."},{speaker:"B",text:"Sure. The revenue chart on slide 8 needed clearer labels."}]},
      { title:"Proposing a New Initiative", context:"An employee presents an idea in a team meeting.", lines:[{speaker:"A",text:"I've been thinking about how we could improve our client onboarding process."},{speaker:"B",text:"We're always looking for improvements. What did you have in mind?"},{speaker:"A",text:"Currently, new clients wait up to two weeks for their first check-in.",isBlank:true,options:["I'd like to propose a structured onboarding checklist with a 48-hour welcome call.","Let's just do what we always do.","Someone else should fix it.","It's not our responsibility."],correct:"I'd like to propose a structured onboarding checklist with a 48-hour welcome call.",explanation:"'I'd like to propose' is assertive yet professional — pairs the problem with a concrete solution."},{speaker:"B",text:"That's a solid idea. Can you draft a proposal for the team?"}]},
    ],
    advanced: [
      { title:"Negotiating a Contract", context:"A supplier and client are in a business meeting.", lines:[{speaker:"A",text:"Thank you for meeting with us today."},{speaker:"B",text:"We've reviewed your proposal carefully."},{speaker:"A",text:"We're prepared to offer a fifteen percent discount for a two-year commitment.",isBlank:true,options:["However, we'd require payment within thirty days of invoice.","And we want triple the price instead.","Or you can go elsewhere.","But only if you pay cash today."],correct:"However, we'd require payment within thirty days of invoice.",explanation:"'However' introduces a condition professionally — balancing an offer with a requirement."},{speaker:"B",text:"That's reasonable. We can work with those terms."}]},
      { title:"Performance Improvement Discussion", context:"A manager meets with an underperforming employee.", lines:[{speaker:"A",text:"I wanted to have a candid conversation about your recent performance metrics."},{speaker:"B",text:"I appreciate you bringing this up directly."},{speaker:"A",text:"The data shows your output has been below target for three consecutive months.",isBlank:true,options:["I'd like to understand the underlying challenges and develop a support plan together.","You should fire me.","I've been working very hard though.","The targets are unreasonable."],correct:"I'd like to understand the underlying challenges and develop a support plan together.",explanation:"A collaborative, solution-focused response shows leadership maturity and turns a difficult conversation constructive."},{speaker:"B",text:"I appreciate that approach. There have been some personal challenges I didn't want to raise."}]},
      { title:"Addressing a Strategic Disagreement", context:"Two senior colleagues disagree about direction.", lines:[{speaker:"A",text:"I respect your perspective but I think our expansion into the US market is premature."},{speaker:"B",text:"Our data shows strong demand signals though."},{speaker:"A",text:"Demand signals are promising, but our operational infrastructure isn't ready to scale.",isBlank:true,options:["I'd recommend a phased approach — entering one region first and evaluating before committing fully.","We should just give up on the idea.","I agree with you then.","Let's ask someone else to decide."],correct:"I'd recommend a phased approach — entering one region first and evaluating before committing fully.",explanation:"Proposing a compromise that respects both data and caution — effective executive communication."},{speaker:"B",text:"That's a prudent middle ground. I can work with a pilot market approach."}]},
    ],
  },
  "Travel": {
    beginner: [
      { title:"Checking into a Hotel", context:"A guest arrives at reception.", lines:[{speaker:"A",text:"Good afternoon. I have a reservation under the name Chen."},{speaker:"B",text:"Welcome! Let me pull that up."},{speaker:"A",text:"Thank you.",isBlank:true,options:["Could I also request a late checkout?","I want to cancel everything.","Is there a pool?","Do you serve midnight breakfast?"],correct:"Could I also request a late checkout?",explanation:"Politely making an additional request at check-in."},{speaker:"B",text:"Of course. We can extend checkout to 1 PM."}]},
      { title:"Asking for Directions", context:"A tourist asks a local for directions.", lines:[{speaker:"A",text:"Excuse me. I'm looking for the main train station."},{speaker:"B",text:"It's about ten minutes on foot.",isBlank:true,options:["Could you point me in the right direction?","I'll take a taxi then.","How far by plane?","Never mind."],correct:"Could you point me in the right direction?",explanation:"'Point me in the right direction' — common phrase for asking for directions."},{speaker:"B",text:"Of course! Head straight down this street, then turn left at the lights."}]},
    ],
    intermediate: [
      { title:"At the Airport — Flight Delay", context:"A passenger speaks with an airline agent.", lines:[{speaker:"A",text:"Excuse me. My flight to Montreal has been delayed."},{speaker:"B",text:"Yes, we apologize for the inconvenience."},{speaker:"A",text:"I have a connecting flight. I'm worried I'll miss it.",isBlank:true,options:["Can you help me rebook if I do?","I want a full refund immediately.","This is your fault entirely.","I'll just drive instead."],correct:"Can you help me rebook if I do?",explanation:"A practical and calm request — shows problem-solving focus."},{speaker:"B",text:"Absolutely. If you miss it, come to the service desk."}]},
      { title:"Haggling at a Market", context:"A tourist is shopping at a local market.", lines:[{speaker:"A",text:"I love this scarf. How much is it?"},{speaker:"B",text:"Fifty dollars."},{speaker:"A",text:"That's a bit more than I was hoping to spend.",isBlank:true,options:["Would you accept forty?","I'll take it, no problem.","That's way too cheap!","I don't want it anymore."],correct:"Would you accept forty?",explanation:"A polite counter-offer using 'Would you accept…' — effective and respectful."},{speaker:"B",text:"Hmm, let me think. Okay, forty-five — my best price."}]},
    ],
    advanced: [
      { title:"Negotiating a Travel Package", context:"A traveller speaks with a travel agent.", lines:[{speaker:"A",text:"I'm interested in the European tour but the price is higher than our budget."},{speaker:"B",text:"We do have some flexibility depending on the dates."},{speaker:"A",text:"We're travelling in the off-season, so occupancy should be lower.",isBlank:true,options:["Given that context, would it be possible to negotiate a reduced rate?","I expect it to be free.","We'll just go with the full price.","We'll find a different agency."],correct:"Given that context, would it be possible to negotiate a reduced rate?",explanation:"Using a logical business argument as leverage — professional negotiation."},{speaker:"B",text:"Given the timing, I can offer ten percent off the listed price."}]},
      { title:"Resolving a Booking Error", context:"A guest discovers a problem with their reservation.", lines:[{speaker:"A",text:"Good evening. I have a reservation but you've given me a smoking room. I specifically requested non-smoking."},{speaker:"B",text:"I sincerely apologize for the error, sir."},{speaker:"A",text:"I have asthma, so this genuinely affects my health.",isBlank:true,options:["I'd appreciate it if you could find an alternative room, and I'd like to understand what compensation is available.","I want to speak to your CEO immediately.","Just forget it.","I'll sleep in my car."],correct:"I'd appreciate it if you could find an alternative room, and I'd like to understand what compensation is available.",explanation:"Assertive but professional — clearly states both the need and the expectation of compensation without aggression."},{speaker:"B",text:"Of course. We'll upgrade you to a suite at no extra charge."}]},
    ],
  },
  "Education": {
    beginner: [
      { title:"Asking a Teacher for Help", context:"A student speaks to their teacher after class.", lines:[{speaker:"A",text:"Excuse me, do you have a minute?"},{speaker:"B",text:"Of course. What can I do for you?"},{speaker:"A",text:"I'm struggling with the grammar unit.",isBlank:true,options:["Could you recommend some extra practice resources?","I want to drop out.","Can I skip the test?","I don't like English."],correct:"Could you recommend some extra practice resources?",explanation:"Polite and proactive — asking for resources shows initiative."},{speaker:"B",text:"Sure! I'll send you some worksheets."}]},
    ],
    intermediate: [
      { title:"Group Study Discussion", context:"Students organize a study group.", lines:[{speaker:"A",text:"Should we meet Thursday to study for the exam?"},{speaker:"B",text:"Thursday works for me.",isBlank:true,options:["Shall we meet at the library or study online?","I will not study with you.","Exams are not important.","Let's skip studying."],correct:"Shall we meet at the library or study online?",explanation:"'Shall we' introduces options politely — effective group planning."},{speaker:"A",text:"The library would be better — less distracting."},{speaker:"B",text:"Agreed. Let's say three o'clock."}]},
      { title:"Requesting an Extension", context:"A student emails their professor about a deadline.", lines:[{speaker:"A",text:"Professor Liu, I'm writing about the essay deadline."},{speaker:"B",text:"Yes, what about it?"},{speaker:"A",text:"I've been dealing with a family emergency this week.",isBlank:true,options:["I was hoping for a short extension if that would be possible.","Please just give me an A.","Can you write it for me?","I think I'll just skip it."],correct:"I was hoping for a short extension if that would be possible.",explanation:"'I was hoping for' + hedging phrase — polite and realistic academic communication."},{speaker:"B",text:"I'm sorry to hear that. You can have until Monday."}]},
    ],
    advanced: [
      { title:"Appealing a Grade", context:"A student meets with their professor about a grade.", lines:[{speaker:"A",text:"Thank you for seeing me. I wanted to discuss my essay grade."},{speaker:"B",text:"Of course. I noticed you seemed surprised."},{speaker:"A",text:"I felt I addressed all the criteria in the rubric.",isBlank:true,options:["Could you walk me through the specific areas where I lost marks?","You made a mistake marking it.","I want a different professor.","The rubric is unfair."],correct:"Could you walk me through the specific areas where I lost marks?",explanation:"Professional and respectful — focuses on learning rather than confrontation."},{speaker:"B",text:"Your argument was strong, but citations needed more consistency."}]},
      { title:"Discussing Academic Integrity", context:"A professor speaks to a student about a concern.", lines:[{speaker:"A",text:"I need to speak with you about your recent submission."},{speaker:"B",text:"Of course. Is something wrong?"},{speaker:"A",text:"There are several passages that closely resemble published sources without proper citation.",isBlank:true,options:["I genuinely wasn't aware of the citation requirements for those sources — could you help me understand how to correct this properly?","I didn't plagiarize anything.","I copied from the internet on purpose.","Other students do it too."],correct:"I genuinely wasn't aware of the citation requirements for those sources — could you help me understand how to correct this properly?",explanation:"Taking accountability while seeking guidance — turns a serious situation into a learning opportunity."},{speaker:"A",text:"I appreciate your honesty. Let's look at it together."}]},
      { title:"Navigating a Scholarship Interview", context:"A student is interviewed for a scholarship.", lines:[{speaker:"A",text:"Tell us about a time you demonstrated leadership."},{speaker:"B",text:"Certainly.",isBlank:true,options:["In my second year, I organized a cross-departmental study initiative that helped twelve students improve their GPA by an average of half a point.","I was team captain once.","I am a very confident person.","I don't have a specific example."],correct:"In my second year, I organized a cross-departmental study initiative that helped twelve students improve their GPA by an average of half a point.",explanation:"Specific, measurable, outcome-oriented example — the STAR method in action."},{speaker:"A",text:"Impressive. How did you manage the different learning styles involved?"}]},
    ],
  },
  "Health": {
    beginner: [
      { title:"Making a Doctor Appointment", context:"Calling a medical clinic.", lines:[{speaker:"A",text:"Good morning, North Medical Clinic. How can I help?"},{speaker:"B",text:"Hi, I'd like to make an appointment with Dr. Patel."},{speaker:"A",text:"Is it for a routine checkup or a specific concern?",isBlank:true,options:["I've been having headaches for about a week.","I feel great actually.","I don't know what a doctor is.","I want to be a nurse."],correct:"I've been having headaches for about a week.",explanation:"Describing a specific symptom helps the receptionist book appropriately."},{speaker:"A",text:"I see. We have an opening Thursday at two."}]},
    ],
    intermediate: [
      { title:"Explaining Symptoms", context:"A patient visits the doctor.", lines:[{speaker:"A",text:"What brings you in today?"},{speaker:"B",text:"I've been feeling tired and my throat is sore.",isBlank:true,options:["The symptoms started about three days ago.","I am always like this.","I ate too much yesterday.","I feel fine actually."],correct:"The symptoms started about three days ago.",explanation:"Providing a time frame for symptoms is important medical information."},{speaker:"A",text:"Any fever or difficulty swallowing?"},{speaker:"B",text:"A mild fever yes, but swallowing is fine."}]},
      { title:"Discussing a Prescription", context:"A patient asks the pharmacist about medication.", lines:[{speaker:"A",text:"Here is my prescription. Can you tell me about the side effects?"},{speaker:"B",text:"Of course. The most common ones are drowsiness and nausea."},{speaker:"A",text:"I drive to work every day.",isBlank:true,options:["Is it safe to take this and drive?","I'll take double the dose.","I won't take it then.","Can I drink alcohol with it?"],correct:"Is it safe to take this and drive?",explanation:"A directly relevant and responsible question about medication safety."},{speaker:"B",text:"I'd advise taking it in the evening until you know how it affects you."}]},
    ],
    advanced: [
      { title:"Discussing a Diagnosis", context:"A doctor explains a diagnosis.", lines:[{speaker:"A",text:"Your results show elevated blood pressure."},{speaker:"B",text:"Is that serious?",isBlank:true,options:["What lifestyle changes would you recommend, and at what point would medication be considered?","I don't believe you.","I'll take any pill you give me.","Can we just ignore it for now?"],correct:"What lifestyle changes would you recommend, and at what point would medication be considered?",explanation:"Asking two targeted, forward-looking questions shows health literacy and proactive engagement."},{speaker:"A",text:"Good questions. Start with diet and exercise. If it doesn't respond in three months, we'll consider medication."}]},
      { title:"Seeking a Second Opinion", context:"A patient speaks with a specialist.", lines:[{speaker:"A",text:"My family doctor suggested surgery, but I wanted another perspective."},{speaker:"B",text:"That's entirely reasonable. Tell me more about your situation."},{speaker:"A",text:"I've had chronic knee pain for two years. I've tried physiotherapy and anti-inflammatories.",isBlank:true,options:["Given that conservative treatments haven't been fully effective, I'd like to understand whether surgery is truly the most appropriate next step.","Just do whatever my doctor said.","I've already decided I won't have surgery.","Can you prescribe something stronger?"],correct:"Given that conservative treatments haven't been fully effective, I'd like to understand whether surgery is truly the most appropriate next step.",explanation:"Articulates medical history and frames a sophisticated question — demonstrates informed patient advocacy."},{speaker:"B",text:"That's exactly the right question. Let me review your imaging."}]},
    ],
  },
  "Food & Cooking": { beginner:[{title:"Ordering at a Café",context:"A customer orders at a coffee shop.",lines:[{speaker:"A",text:"What can I get for you?"},{speaker:"B",text:"I'd like a medium latte please.",isBlank:true,options:["Could I also get a blueberry muffin?","I want everything on the menu.","Do you sell cars?","I hate coffee."],correct:"Could I also get a blueberry muffin?",explanation:"Adding to an order politely using 'could I also'."},{speaker:"A",text:"Of course! That'll be seven fifty."}]},{title:"Dietary Request at a Restaurant",context:"A customer makes a special request.",lines:[{speaker:"A",text:"Welcome! Ready to order?"},{speaker:"B",text:"Yes, I'd like the grilled salmon.",isBlank:true,options:["But could you prepare it without butter? I'm lactose intolerant.","And make it spicy and cold.","I want it raw please.","Bring me something else."],correct:"But could you prepare it without butter? I'm lactose intolerant.",explanation:"Politely making a dietary accommodation request with a reason."},{speaker:"A",text:"Absolutely, we can accommodate that."}]}], intermediate:[{title:"Sending Back a Dish",context:"A diner has a complaint.",lines:[{speaker:"A",text:"Excuse me, I think there may be an issue with my steak."},{speaker:"B",text:"I'm sorry to hear that. What's the problem?"},{speaker:"A",text:"I ordered it medium but it's quite well done.",isBlank:true,options:["Could you please have it remade?","This is the worst restaurant ever.","I'll eat it anyway.","Bring me the manager immediately."],correct:"Could you please have it remade?",explanation:"A calm, clear request — the most effective way to resolve a restaurant issue."},{speaker:"B",text:"Of course, I'll have the kitchen take care of it right away."}]},{title:"Asking for a Recipe",context:"A guest compliments the host's cooking.",lines:[{speaker:"A",text:"This pasta is absolutely delicious!"},{speaker:"B",text:"Thank you so much!",isBlank:true,options:["I'd love the recipe if you'd be willing to share it.","How much did it cost to make?","You should open a restaurant.","Is this from a box?"],correct:"I'd love the recipe if you'd be willing to share it.",explanation:"'I'd love to' + 'if you'd be willing' — enthusiastic but respectful request."},{speaker:"A",text:"Of course! I'll send it to you after dinner."}]}], advanced:[{title:"Food Critics Debate",context:"Two critics discuss a tasting menu.",lines:[{speaker:"A",text:"What did you think of the tasting menu overall?"},{speaker:"B",text:"Technically impressive but lacking narrative coherence.",isBlank:true,options:["Each course felt thematically disconnected, as if three different chefs had designed the menu without consulting each other.","I loved every dish equally.","The portions were too large.","I have no opinion."],correct:"Each course felt thematically disconnected, as if three different chefs had designed the menu without consulting each other.",explanation:"Sophisticated critique using a specific analogy — elevates the observation beyond mere preference."},{speaker:"A",text:"Exactly my feeling. The dessert especially jarred with the savoury progression."}]}] },
  "Shopping":    { beginner:[{title:"Returning an Item",context:"Returning a jacket to a store.",lines:[{speaker:"A",text:"Hi, I'd like to return this jacket."},{speaker:"B",text:"Do you have your receipt?",isBlank:true,options:["Yes, here it is. I'd prefer a refund.","No, I lost everything.","I want a different colour too.","Yes, but I bought it years ago."],correct:"Yes, here it is. I'd prefer a refund.",explanation:"Providing the receipt and stating your preference clearly."},{speaker:"B",text:"No problem. It'll appear on your card in three to five days."}]},{title:"Asking About a Product",context:"Asking a store employee for help.",lines:[{speaker:"A",text:"Do you carry running shoes for flat feet?"},{speaker:"B",text:"Yes, we have a few options designed for that.",isBlank:true,options:["Could you show me which ones you'd recommend?","Just show me the cheapest ones.","I'll look myself.","Do you have any in gold?"],correct:"Could you show me which ones you'd recommend?",explanation:"Asking for a recommendation shows trust in the expert's knowledge."},{speaker:"B",text:"Absolutely. Follow me — I'll bring a few styles to try."}]}], intermediate:[{title:"Negotiating a Price",context:"Buying a second-hand item.",lines:[{speaker:"A",text:"I'm interested in the sofa. It's listed at eight hundred."},{speaker:"B",text:"That's correct."},{speaker:"A",text:"It's in great condition but has a small stain on the armrest.",isBlank:true,options:["Would you consider seven fifty given that?","I'll pay nine hundred because I love it.","I'm not interested anymore.","That's very cheap."],correct:"Would you consider seven fifty given that?",explanation:"Using a specific flaw as polite negotiating leverage — practical and fair."},{speaker:"B",text:"That's reasonable. Seven fifty it is."}]}], advanced:[{title:"B2B Procurement Negotiation",context:"A buyer and vendor discuss a large order.",lines:[{speaker:"A",text:"We're looking at ordering five hundred units of the enterprise model."},{speaker:"B",text:"That's a significant order. What price point are you targeting?"},{speaker:"A",text:"Given the volume and our existing relationship, we were expecting preferential terms.",isBlank:true,options:["We'd need at least a twelve percent reduction from list price along with extended payment terms of sixty days.","We'll pay whatever you want.","Actually we only need one unit.","Price doesn't matter to us."],correct:"We'd need at least a twelve percent reduction from list price along with extended payment terms of sixty days.",explanation:"States two specific commercial requirements — percentage and payment terms — demonstrating procurement sophistication."},{speaker:"B",text:"A twelve percent reduction is workable. Let's align on delivery schedule and formalize terms."}]}] },
  "Technology":  { beginner:[{title:"Tech Support Call",context:"Calling technical support.",lines:[{speaker:"A",text:"Thank you for calling tech support. How can I help?"},{speaker:"B",text:"My internet is not working.",isBlank:true,options:["I've already tried restarting the router.","I never use the internet.","I think it's raining outside.","My computer is old."],correct:"I've already tried restarting the router.",explanation:"Mentioning steps you've already tried helps support staff skip basic steps."},{speaker:"A",text:"Good thinking. Let's check your modem lights next."}]}], intermediate:[{title:"Software Bug Discussion",context:"Two colleagues discuss a system bug.",lines:[{speaker:"A",text:"The system keeps crashing when we upload large files."},{speaker:"B",text:"Have you checked the error log?",isBlank:true,options:["Yes, it seems to be a memory allocation issue.","No, I ignore error messages.","I deleted the log.","Logs are not important."],correct:"Yes, it seems to be a memory allocation issue.",explanation:"Showing you've already investigated — efficient and professional."},{speaker:"A",text:"Makes sense. Let's increase the server memory and test."}]},{title:"Proposing a Digital Solution",context:"A team meeting about improving customer communication.",lines:[{speaker:"A",text:"Customers are complaining about slow response times from our support team."},{speaker:"B",text:"What do you suggest?"},{speaker:"A",text:"Response times average over forty-eight hours right now.",isBlank:true,options:["I'd recommend implementing a ticketing system with automated acknowledgments and priority routing.","Let's just hire more people.","Tell customers to be patient.","I don't have a suggestion."],correct:"I'd recommend implementing a ticketing system with automated acknowledgments and priority routing.",explanation:"Specific, actionable technology recommendation with two concrete features — persuasive and credible."},{speaker:"B",text:"Great suggestion. Can you research some options for the next meeting?"}]}], advanced:[{title:"Technology Strategy",context:"An executive meeting about digital transformation.",lines:[{speaker:"A",text:"Our current infrastructure is slowing down our ability to scale."},{speaker:"B",text:"I agree. What's your recommendation?"},{speaker:"A",text:"The core issue is our monolithic architecture — every change requires a full deployment cycle.",isBlank:true,options:["I'd propose a phased migration to a microservices architecture, starting with the three highest-traffic modules to minimize risk while demonstrating value early.","We should buy new computers.","Let's outsource everything.","Maybe the problem will go away."],correct:"I'd propose a phased migration to a microservices architecture, starting with the three highest-traffic modules to minimize risk while demonstrating value early.",explanation:"Highly specific technical proposal with a risk-managed approach and clear rationale — executive-level communication."},{speaker:"B",text:"A phased approach is smart. Can you put together an architecture proposal by the end of Q2?"}]}] },
  "Environment": { beginner:[{title:"Recycling Discussion",context:"Neighbours talk about waste bins.",lines:[{speaker:"A",text:"Do you know what goes in the blue bin?"},{speaker:"B",text:"That one is for paper and cardboard.",isBlank:true,options:["What about plastic bottles — do they go there too?","I don't recycle.","I put everything in one bin.","I never use it."],correct:"What about plastic bottles — do they go there too?",explanation:"A natural follow-up question to clarify recycling rules."},{speaker:"B",text:"Yes, most plastics and glass go in the blue bin as well."}]}], intermediate:[{title:"Community Cleanup",context:"Organizing a neighbourhood event.",lines:[{speaker:"A",text:"We'd like to organize a community cleanup day."},{speaker:"B",text:"That's a great idea.",isBlank:true,options:["I'd be happy to help coordinate volunteers if you need support.","I'm too busy to care.","Someone else should do it.","The neighbourhood looks fine."],correct:"I'd be happy to help coordinate volunteers if you need support.",explanation:"Volunteering proactively — positive community engagement."},{speaker:"A",text:"Wonderful! We're planning the last Saturday of the month."}]},{title:"Corporate Sustainability Meeting",context:"Staff meeting about eco-policy.",lines:[{speaker:"A",text:"We need to reduce our office waste by thirty percent this year."},{speaker:"B",text:"What practical steps do you propose?"},{speaker:"A",text:"Currently we have no recycling bins at individual workstations and rely solely on a central bin.",isBlank:true,options:["I'd suggest installing recycling bins at each desk along with a brief staff education session on what can and cannot be recycled.","Just tell people to recycle.","Buy recycled paper.","Let's hire an environmental consultant."],correct:"I'd suggest installing recycling bins at each desk along with a brief staff education session on what can and cannot be recycled.",explanation:"Infrastructure + education — a two-pronged practical solution."},{speaker:"B",text:"That's actionable. Let's pilot it in one department first."}]}], advanced:[{title:"Environmental Policy Advocacy",context:"Meeting with local council members.",lines:[{speaker:"A",text:"The proposed industrial development will significantly affect the wetland ecosystem."},{speaker:"B",text:"We understand the environmental concerns."},{speaker:"A",text:"This wetland filters water for over twelve thousand residents and supports protected species.",isBlank:true,options:["Given the public health and ecological stakes, we formally request an independent environmental impact assessment conducted by a third party before any approval is granted.","Can you just ignore the wetland?","The ecosystem is not important.","We support the development fully."],correct:"Given the public health and ecological stakes, we formally request an independent environmental impact assessment conducted by a third party before any approval is granted.",explanation:"Grounds the request in concrete public health data and uses formal procedural language — highly effective civic advocacy."},{speaker:"B",text:"Given those numbers, an independent review is certainly warranted."}]}] },
  "Immigration": { beginner:[{title:"At the Border",context:"A traveller speaks to a border officer.",lines:[{speaker:"A",text:"Good morning. May I see your passport and travel documents?"},{speaker:"B",text:"Of course, here you are.",isBlank:true,options:["I'm visiting family for two weeks.","I want to stay forever.","I don't have documents.","I'm not sure why I'm here."],correct:"I'm visiting family for two weeks.",explanation:"A clear, honest, concise answer to the border officer's implicit purpose question."},{speaker:"A",text:"Thank you. Enjoy your stay."}]}], intermediate:[{title:"Settlement Worker Consultation",context:"A newcomer meets a settlement worker.",lines:[{speaker:"A",text:"I submitted my work permit application three months ago."},{speaker:"B",text:"Have you received any correspondence from them?",isBlank:true,options:["Not yet. Is there a way to check the status online?","Yes they called yesterday.","I never check my mail.","I withdrew the application."],correct:"Not yet. Is there a way to check the status online?",explanation:"Shows proactive problem-solving after providing the direct answer."},{speaker:"B",text:"Yes, track it through the government portal with your reference number."}]},{title:"Explaining Immigration Status",context:"A new employee completes HR paperwork.",lines:[{speaker:"A",text:"For your employment file, we'll need to verify your work authorization."},{speaker:"B",text:"Of course."},{speaker:"A",text:"Are you a Canadian citizen, permanent resident, or on a work permit?",isBlank:true,options:["I'm on an open work permit valid until December of next year. I can provide a copy of the document.","I'm not sure.","That's private information.","I have all kinds of papers."],correct:"I'm on an open work permit valid until December of next year. I can provide a copy of the document.",explanation:"Answers directly with key details (type + expiry) and offers documentation — professional and transparent."},{speaker:"A",text:"Perfect. Please send a copy to HR and we'll update your file."}]}], advanced:[{title:"Citizenship Application Interview",context:"A citizenship officer interviews an applicant.",lines:[{speaker:"A",text:"Can you tell us about your ties to the Canadian community?"},{speaker:"B",text:"Certainly.",isBlank:true,options:["Over the past four years I've volunteered regularly at a food bank, served on the board of a newcomer support organization, and mentored three recent immigrants through their settlement process.","I mainly stay home.","I pay my taxes.","I have friends who are Canadian."],correct:"Over the past four years I've volunteered regularly at a food bank, served on the board of a newcomer support organization, and mentored three recent immigrants through their settlement process.",explanation:"Three concrete, specific examples of increasing responsibility — demonstrates genuine civic commitment rather than generic claims."},{speaker:"A",text:"That reflects significant and varied community engagement. Thank you."}]},{title:"Humanitarian Case Presentation",context:"A refugee applicant meets with their legal representative.",lines:[{speaker:"A",text:"We need to build the strongest possible case before your hearing."},{speaker:"B",text:"I want to be completely honest about everything."},{speaker:"A",text:"That's exactly the right approach. The board needs to understand why return is not safe.",isBlank:true,options:["In addition to the documented threats I've described, I can provide witness statements, medical records of the injuries I sustained, and country condition reports from three credible international human rights organizations.","I'll just tell them my story.","I don't have any documents.","Can you just handle it?"],correct:"In addition to the documented threats I've described, I can provide witness statements, medical records of the injuries I sustained, and country condition reports from three credible international human rights organizations.",explanation:"Proactively identifies three distinct categories of evidence — demonstrates legal preparedness and seriousness of claim."},{speaker:"A",text:"Excellent. That corroborating evidence will significantly strengthen your application."}]}] },
};

function getDialogues(topic: string, difficulty: string, count: number): Dialogue[] {
  const t = ALL_DIALOGUES[topic] || ALL_DIALOGUES["Daily Life"];
  const pool = t[difficulty] || t["intermediate"] || t["beginner"] || t["advanced"] || [];
  if (pool.length === 0) {
    const fb = ALL_DIALOGUES["Daily Life"];
    const fbPool = fb[difficulty] || fb["beginner"] || [];
    return shuffle(fbPool).slice(0, Math.min(count, fbPool.length));
  }
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

const CLB_D: Record<string,string> = { beginner:"CLB 4-5", intermediate:"CLB 6-7", advanced:"CLB 8+" };
const COMPLEXITY: Record<string,string> = {
  beginner: "simple everyday conversations with basic vocabulary",
  intermediate: "workplace, social, and service situations with moderate complexity",
  advanced: "professional negotiations, formal requests, complex social situations with sophisticated language",
};

function DialogueInner({ config, onBack, onReset }: { config: GameConfig; onBack:()=>void; onReset:()=>void }) {
  const staticFallback = getDialogues(config.topic, config.difficulty, 4);

  const [isGenerating, setIsGenerating] = useState(true);
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string|null>(null);
  const [feedback, setFeedback] = useState<"correct"|"wrong"|null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.duration * 60);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    async function load() {
      const prompt = `Generate exactly 5 dialogue completion exercises about "${config.topic}" at ${config.difficulty} level (${CLB_D[config.difficulty]}).
Complexity: ${COMPLEXITY[config.difficulty]}.
Each dialogue has 3-5 exchanges (lines) between speakers A and B. One line must be marked isBlank:true with 4 options (only one is the best response).
The correct answer should clearly fit better than the 3 distractors. Include a brief explanation.
Return ONLY a JSON array:
[{"title":"Short Title","context":"Brief scene description","lines":[
  {"speaker":"A","text":"..."},
  {"speaker":"B","text":"...","isBlank":true,"options":["Best response","Wrong 1","Wrong 2","Wrong 3"],"correct":"Best response","explanation":"Why this is best"}
]}]`;
      const generated = await generateGameContent<Dialogue[]>(prompt, staticFallback);
      const valid = generated.filter(d => {
        if (!d?.title || !d?.lines || !Array.isArray(d.lines)) return false;
        const blank = d.lines.find(l => l.isBlank);
        return blank && blank.options?.length === 4 && blank.correct && blank.options.includes(blank.correct);
      });
      setDialogues(valid.length >= 2 ? valid.slice(0, 4) : staticFallback);
      setIsGenerating(false);
    }
    load();
  }, []);

  const current = isGenerating ? null : dialogues[idx];
  const blankLine = current?.lines?.find(l => l.isBlank);
  const shuffledOpts = useMemo(() => shuffle(blankLine?.options || []), [idx, dialogues.length]);
  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  useEffect(() => {
    if (gameOver || isGenerating) return;
    if (timeLeft <= 0) { setGameOver(true); return; }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, gameOver, isGenerating]);

  const handleSelect = (opt: string) => {
    if (feedback) return;
    setSelected(opt);
    const ok = opt === blankLine?.correct;
    setFeedback(ok ? "correct" : "wrong");
    if (ok) setScore(s => s + 1);
  };

  const next = () => {
    if (idx + 1 >= dialogues.length) { setGameOver(true); return; }
    setIdx(i => i + 1);
    setSelected(null);
    setFeedback(null);
  };

  if (isGenerating) return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-xs w-full mx-4">
        <div className="w-12 h-12 border-4 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-gray-700 font-semibold">Generating AI dialogues…</p>
        <p className="text-gray-400 text-sm mt-1">Every session is unique!</p>
      </div>
    </div>
  );

  // Guard: if no dialogue found for this topic/difficulty, show fallback
  if (!dialogues.length || !current || !blankLine) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col">
        <button onClick={onBack} className="flex items-center gap-2 px-6 py-4 text-gray-500 hover:text-gray-800 text-sm font-medium"><ArrowLeft className="w-4 h-4"/>Back</button>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-sm">
            <p className="text-gray-600 mb-4">No dialogues available for this topic and difficulty.<br/>Try a different topic or difficulty level.</p>
            <button onClick={onBack} className="px-6 py-3 bg-rose-500 text-white rounded-xl font-semibold text-sm">Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-rose-50">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4"/>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Conversations Complete! 🎉</h2>
          <p className="text-gray-500 mb-6">{score} of {dialogues.length} correct</p>
          <div className="text-5xl font-black text-rose-500 mb-6">{Math.round(score/dialogues.length*100)}%</div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onBack} className="py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Exit</button>
            <button onClick={onReset} className="py-3 rounded-xl bg-rose-500 text-white font-semibold text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Game</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rose-50 pb-8">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-medium"><ArrowLeft className="w-4 h-4"/>Back</button>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">{dialogues.map((_,i)=><div key={i} className={`w-2 h-2 rounded-full ${i<idx?"bg-rose-400":i===idx?"bg-rose-600":"bg-gray-200"}`}/>)}</div>
          <span className={`flex items-center gap-1 font-semibold text-sm ${timeLeft<30?"text-red-500":"text-gray-700"}`}><Clock className="w-4 h-4"/>{fmt(timeLeft)}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <h1 className="text-lg font-bold text-gray-800 mb-1">Dialogue Completion — {config.topic}</h1>
        <p className="text-sm text-gray-500 mb-4">Choose the best response to complete the conversation.</p>

        {/* Dialogue card */}
        <div className="bg-white rounded-2xl border border-rose-200 p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-rose-400"/>
            <h2 className="font-semibold text-gray-800 text-sm">{current.title}</h2>
          </div>
          <p className="text-xs text-gray-400 italic mb-4">{current.context}</p>
          <div className="space-y-3">
            {current.lines.map((line, i) => {
              const isBlank = line.isBlank;
              return (
                <div key={i} className={`flex gap-3 ${line.speaker==="B"?"flex-row-reverse":""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${line.speaker==="A"?"bg-blue-100 text-blue-700":"bg-rose-100 text-rose-600"}`}>
                    {line.speaker==="A" ? <User className="w-4 h-4"/> : <MessageSquare className="w-4 h-4"/>}
                  </div>
                  <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${line.speaker==="A"?"bg-gray-100 text-gray-800 rounded-tl-none":"bg-rose-100 text-rose-900 rounded-tr-none"}
                    ${isBlank && !selected ? "border-2 border-dashed border-rose-400 bg-rose-50" : ""}
                    ${isBlank && feedback==="correct" ? "bg-green-100 border-2 border-green-400 text-green-800" : ""}
                    ${isBlank && feedback==="wrong" ? "bg-red-100 border-2 border-red-400 text-red-700" : ""}`}>
                    {isBlank
                      ? selected
                        ? selected
                        : <span className="text-rose-400 font-semibold">[ Choose a response below ]</span>
                      : line.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {feedback && (
          <div className={`rounded-xl px-4 py-3 mb-4 text-sm ${feedback==="correct"?"bg-green-100 text-green-800":"bg-amber-50 text-amber-800 border border-amber-200"}`}>
            {feedback==="correct"
              ? <><strong>✓ Correct!</strong> {blankLine?.explanation}</>
              : <><strong>💡 Answer:</strong> "{blankLine?.correct}". {blankLine?.explanation}</>}
          </div>
        )}

        {!feedback && (
          <div className="space-y-2 mb-4">
            {shuffledOpts.map(opt => (
              <button key={opt} onClick={()=>handleSelect(opt)}
                className="w-full text-left px-4 py-3.5 rounded-2xl border-2 border-rose-200 bg-white text-gray-700 text-sm font-medium hover:bg-rose-50 hover:border-rose-400 transition">
                {opt}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-2">
          {!feedback ? (
            <>
              <button onClick={onReset}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4"/>New Session
              </button>
              <button onClick={() => { setSelected(blankLine?.correct || ""); setFeedback("wrong"); }}
                className="flex-1 py-3 rounded-xl border border-rose-300 text-rose-600 font-semibold text-sm hover:bg-rose-50 flex items-center justify-center gap-2">
                Check Answer
              </button>
            </>
          ) : (
            <button onClick={next} className="w-full py-3 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 flex items-center justify-center gap-2">
              {idx+1<dialogues.length?"Next Dialogue":"See Results"} <ChevronRight className="w-4 h-4"/>
            </button>
          )}
        </div>
        <p className="text-center mt-3 text-xs text-gray-500">Score: <span className="font-bold text-rose-500">{score}/{idx+(feedback?1:0)}</span></p>
      </div>
    </div>
  );
}

export default function DialogueCompletion({ config, onBack }: Props) {
  const [key, setKey] = useState(0);
  return <DialogueInner key={key} config={config} onBack={onBack} onReset={() => setKey(k => k + 1)} />;
}
