# Avatar Quality And Budget Policy

## Principle

Avatar quality should be controlled by the customer plan and customer policy, not by a fixed product rule.

Some customers can afford full live premium avatar responses. Others need predictable cost control. The platform should support both.

## Decision Guide

### Quick Comparison

| Mode | Customer Mindset | Default Avatar Behavior | Typical Customer | Budget Style |
|---|---|---|---|---|
| Full Live Premium | "We want the best experience. Cost is secondary." | Premium live avatar for safe known and new answers | Sonatrach/Sonelgaz-style enterprises, banks, telecoms, premium HQs | High budget, usage-based or committed spend |
| Budgeted Premium | "We want premium, but finance needs controls." | Premium until budget threshold, then adaptive fallback | Large multi-branch companies, busy public locations | Medium/high budget with hourly/daily/monthly caps |
| Adaptive Hybrid | "We want a premium feel without wasting money." | Cached premium for approved repeated answers, lightweight for new questions | Malls, universities, medium companies, public-service branches | Medium budget, optimized over time |
| Lite First | "We need a useful assistant at predictable low cost." | Lightweight avatar by default, premium only for selected answers | Small malls, shops, small branches, small facilities, pilots | Low budget, strict limits |

### How Customers Should Think About The Modes

#### Choose Full Live Premium if:

- The assistant represents a high-value brand.
- The location is strategic or high visibility.
- The customer wants the most realistic experience.
- Usage cost is acceptable compared to customer service value.
- The budget can support live avatar responses for most conversations.

#### Choose Budgeted Premium if:

- The customer wants a premium experience but needs invoice predictability.
- Usage may spike at certain hours or locations.
- The finance team needs hard limits or alerts.
- The customer wants premium by default, with automatic fallback when limits are reached.

#### Choose Adaptive Hybrid if:

- The customer has many repeated questions.
- The customer wants premium answers for common topics.
- New or rare questions can use a lighter avatar.
- The customer wants the system to improve over time.
- The customer is willing to review and upgrade useful new answers in batches.

#### Choose Lite First if:

- The customer mainly needs utility.
- The budget is small or uncertain.
- Predictable cost matters more than realism.
- Premium avatar should be reserved for only a few important answers.
- The customer wants to start small and upgrade later.

## Customer Policy Modes

### 1. Full Live Premium

Best for:

- Large enterprises.
- Energy companies.
- Banks.
- Telecoms.
- High-profile headquarters.
- Premium government or airport deployments.

Behavior:

- Use realistic live avatar for known and new questions.
- Keep cached videos for speed when available.
- Allow live premium avatar generation during conversation.
- Still keep abuse protection and optional spend alerts.

This mode fits customers where service quality and brand image matter more than API cost.

### 2. Budgeted Premium

Best for:

- Large companies that want premium experience but need finance controls.
- Multi-location deployments.
- Public locations where usage may spike.

Behavior:

- Use premium live avatar until hourly, daily, or monthly budget thresholds are reached.
- Switch to adaptive/lite mode after a threshold.
- Alert admin before and after budget limits.
- Optionally allow manager override.

Example:

```text
0-80% of daily budget: premium live allowed
80-100%: premium only for approved/high-priority categories
100%+: cached premium + lite live fallback
```

### 3. Adaptive Hybrid

Best for:

- Malls.
- Universities.
- Medium companies.
- Public-service branches.
- Locations with many repeated questions.

Behavior:

- Use cached premium video for approved repeated answers.
- Use lightweight animated avatar for new or low-value questions.
- Save new useful Q&A as candidates.
- Batch upgrade selected answers to premium later.

This mode balances quality, speed, and predictable cost.

### 4. Lite First

Best for:

- Small malls.
- Small shops.
- Local branches.
- Small public facilities.
- Budget-sensitive pilots.

Behavior:

- Use lightweight animated avatar for most live answers.
- Use premium video only for important approved answers.
- Keep strict daily/monthly limits.
- Focus on usefulness over realism.

## Budget Controls

Customers should be able to configure:

- Hourly budget.
- Daily budget.
- Monthly budget.
- Budget per location.
- Budget per kiosk.
- Maximum premium live minutes.
- Maximum live AI responses.
- Maximum cost per session.
- Behavior when budget is reached.

## Abuse Controls

Even rich customers may want controls to avoid misuse.

Controls:

- Session time limits.
- Cooldown after repeated nonsense questions.
- Blocklisted topics.
- Staff-only override.
- Rate limits per kiosk.
- Alert on unusual usage spikes.

## Content Risk Is Separate From Budget

Budget controls decide how expensive the avatar response can be.

Safety controls decide whether the system is allowed to answer.

For example, a large company may pay for full live premium avatar, but a sensitive legal or medical question should still use approved content or human handoff.

## Product Positioning

Do not describe this as cheap mode.

Use language like:

- Adaptive quality.
- Lite assistant.
- Cost-controlled mode.
- Premium live mode.
- Budget governor.

The customer should feel they are choosing the right operational policy, not accepting a lower-quality product.

## Example Customer Fit

### Sonatrach/Sonelgaz-Style Headquarters

Recommended mode:

- Full Live Premium or Budgeted Premium.

Reason:

- High brand expectations.
- Large budgets.
- Important visitor experience.
- Likely need enterprise controls, analytics, and SLA.

### Bank Or Telecom Branch Network

Recommended mode:

- Budgeted Premium.

Reason:

- Premium customer experience matters.
- Multi-branch usage can become expensive.
- Daily/monthly caps and abuse controls are important.

### Medium Mall

Recommended mode:

- Adaptive Hybrid.

Reason:

- Many repeated questions.
- Premium videos for store directory, services, opening hours, and major FAQs.
- Lightweight live avatar for unusual visitor questions.

### University Or Private School

Recommended mode:

- Adaptive Hybrid.

Reason:

- Repeated admissions and campus questions.
- Budget matters, but the experience still needs to feel professional.
- New questions can be reviewed and upgraded over time.

### Small Shop, Local Branch, Or Small Public Facility

Recommended mode:

- Lite First.

Reason:

- Lower budget.
- Need simple multilingual help.
- Premium avatar only for selected high-value answers.
- Strict cost predictability is more important than realism.

## Sales Explanation

Simple customer-facing version:

> You choose how premium the assistant should be. Large customers can run full live realistic avatar mode. Budget-sensitive customers can use adaptive or lite modes, where the assistant stays useful and multilingual while keeping costs predictable.
