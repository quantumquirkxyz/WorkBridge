# 0001-interactive-interview-redesign.md

## Status
Accepted

## Context
The skill-creator skill was originally a static, worksheet-based guide for creating skills. As the skills ecosystem evolved, there was a need to make skill creation more accessible, interactive, and guided. Users were finding the worksheet approach too rigid and time-consuming, and wanted a more conversational way to explore their skill ideas while still getting the benefits of structured skill creation.

## Decision
Transform the skill-creator skill from a static guide to an interactive interview and collaborative design tool that:
1. Conducts a conversational interview to understand user needs through targeted questions
2. Proposes skill architectures, resources, and workflows based on user input for collaborative refinement
3. Offers assisted research capabilities to enrich designs with current best practices and existing patterns
4. Suggests skill names based on keywords and category discussed during the interview
5. Generates complete skill structures with all required components (SKILL.md, scripts/, references/, assets/, adrs/)
6. Maintains backward compatibility with existing init_skill.py and package_skill.py scripts
7. Provides both interactive (chat-based) and non-interactive (script-based) modes for flexibility

## Alternatives Considered

### 1. Keep the static worksheet-based approach
- **Pros**: Familiar to existing users, well-documented, low technical complexity
- **Cons**: Rigid and inflexible, doesn't adapt to user responses, requires users to know all answers upfront, no collaborative element
- **Outcome**: Rejected because it didn't meet the goal of making skill creation more accessible and guided

### 2. Create a completely separate interactive skill
- **Pros**: Clean separation of concerns, no risk to existing functionality
- **Cons**: Duplication of effort, users would need to learn and use two different skills, maintenance overhead
- **Outcome**: Rejected because it would fragment the skill creation experience

### 3. Enhance the existing skill with optional interactive mode (chosen approach)
- **Pros**: Builds on existing work, maintains backward compatibility, offers choice to users, incremental improvement
- **Cons**: Slightly more complex implementation, need to manage both modes
- **Outcome**: Selected because it provides the best balance of innovation and compatibility

### 4. Make interactive mode the only mode and remove worksheets entirely
- **Pros**: Simpler implementation, focused user experience
- **Cons**: Breaks backward compatibility, removes option for users who prefer worksheets
- **Outcome**: Rejected to maintain backward compatibility and user choice

## Consequences

### Positive
- **User Experience**: More engaging and guided skill creation process that adapts to user responses
- **Accessibility**: Lowers barrier to entry for new skill creators through conversational guidance
- **Quality**: Better skills through collaborative design and research-assisted decision making
- **Flexibility**: Users can choose between interactive conversation or traditional worksheets
- **Efficiency**: Reduces time spent on skill creation by guiding users through relevant questions
- **Learning**: Users learn about skill design principles through the interview process
- **Compatibility**: Existing init_skill.py and package_skill.py scripts continue to work unchanged
- **Completeness**: Generated skills include all necessary components (ADRs, references, assets, etc.)

### Negative
- **Complexity**: Increased implementation complexity due to dual modes and state management
- **Performance**: Interactive mode may be slower than filling out worksheets for experienced users
- **Guidance Quality**: Dependence on the quality of interview questions and agent proposals
- **Scope Creep**: Risk of making the interview too long or overwhelming if not carefully managed
- **Maintenance**: Need to maintain both interactive and traditional documentation

### Neutral
- **Skill Structure**: Generated skills follow the same structure and standards as before
- **Validation**: Same validation criteria apply to skills created via either mode
- **Documentation**: Traditional worksheet approach remains documented for users who prefer it