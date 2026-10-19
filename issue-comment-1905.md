## Shape settled at the 2026-09-24 Frontend Working Group: one app, tabs become widgets

Recording the outcome of the [2026-09-24 FWG meeting](https://openedx.atlassian.net/wiki/x/AgCRlAE) (agenda item "Multiple apps per repo") so this issue carries it. It answers the open question between my September comment above and @arbrandes's reply.

> [!NOTE]
> The summary below was written by Claude (Claude Code) from the meeting transcript and reviewed before posting. Quotes are from the auto-generated transcript, lightly trimmed.

<details>
<summary>Meeting outcome</summary>

### 1. The motivation is agreed: detangle the tabs and keep them detangled

What I asked for was per-tab independence, not per-tab packaging:

> If you're loading the outline tab, it works and it doesn't rely on a bunch of other weird things. And the dates tab doesn't rely on the outline tab. And the courseware [...] is not reliant on some other tabs being rendered [...] they could all work standalone and be tested as working standalone. [...] I want to make sure that stuff doesn't get tangled again.

@arbrandes: "I agree with Brian 100% on the motivation. It's just about the implementation really."

### 2. The implementation is widgets, not apps

His objection to one-app-per-tab was the per-app wiring: "my thinking on the different apps in the same repo is that it'll actually make things more complicated, because of all of the wiring and [...] all the boilerplate that each app needs." The alternative is the widget pattern frontend-base apps already use: "we're calling these things that you described widgets. They're separate. They're not supposed to be tangled with anything else. They should not reach into context that they don't know."

The two positions turned out to be the same thing under different words. I had meant the frontend-base `App` type, not a separate package ("I didn't mean it should be a thing like the repo. I was thinking that app type, that is what I want the tabs to be."), and a widget is that: "It looks like an app. The only difference is we don't publish it as one."

Precedents named in the meeting:

- `frontend-app-learner-dashboard`'s [`src/widgets/`](https://github.com/openedx/frontend-app-learner-dashboard/tree/master/src/widgets): self-contained pieces that insert themselves into the app's own slots and can be exported. The dashboard header is the example of a declared widget used by the app that declares it, and there is already a request to export it for other sites.
- openedx/frontend-app-gradebook#632: gradebook exports its main view as a widget and the instructor dashboard renders it in a slot. The review there set the contract for a "proper widget": configured through props or another explicit contract, never by reaching into context it does not own.

The same door opens the other way: "learning could insert its own widgets into other apps, if that ever comes up."

### 3. Sequencing: convert first, widgetize second

> I assume the initial conversion of learning to base I won't be making widgets for everything. I'll just be throwing it all together and making it work, so we have at least the slots converted and things render and work. That'll be the initial conversion, then it'll be widgetize everything.

So this issue is the first step only. The widget split is follow-up work after the conversion lands.

### 4. Query keys are not part of the contract yet; the experiment belongs to the widget phase

@arbrandes on what a widget may depend on: "they can do their own query of course, but they don't redeclare the query client. They depend on the top-level query client. Anything else is not part of the contract, not even the query keys are part of the contract yet. Remember we have that as a backlog item to decide." That backlog item is openedx/frontend-base#253.

The concrete case is the one from section 2 of my September comment, seen from the other side: the instructor dashboard needed an attribute from `course_metadata`, could not read the header's course-tabs query because that is outside the contract, and paid for it with a second fetch. His sketch of the fix: "I imagine we're going to want a provides mechanism for each app. So this app provides this kind of [data], so another app could consume that thing as a query key, so they know it's already being loaded so they don't do it again. But if it's not provided, they fall back to something."

What the Learning conversion established about when duplication actually happens: soft navigation reuses the cache, so the only double fetch is several consumers mounting on the same page load, which the `enabled: false` owner-and-readers pattern already handles within Learning. With documented shared keys, Learning and the instructor dashboard "would just use the same key for course metadata, and you'd be able to just soft-nav over [...] the cache is already populated."

Action item from the meeting: I experiment with shared query keys and a `provides` mechanism during the widget phase, not during this conversion.

</details>

**What this changes for this issue:** the "flat list or parent app" question from my September comment is moot; Learning stays one app. The TODO list could gain two items after the existing ones: split the tabs into widgets (follow-up, after this lands), and the shared-query-key experiment under openedx/frontend-base#253.
