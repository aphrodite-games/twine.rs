#![doc = "Command, patch, transaction, and snapshot spine for the Twine core."]

use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use thiserror::Error;
use ts_rs::TS;
use twine_graph::{
    AutoLayoutOptions, GraphDirection, GraphEdgeKind, GraphFocus, GraphIndex, GraphLayoutSource,
    GraphLayoutState, GraphProjectionOptions, GraphViewport, LinkLayerOptions,
};
use twine_model::{
    GraphPosition, Passage, PassageId, PassageIndex, PassageLayout, Project, Story, StoryId,
};

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreRect {
    pub height: f64,
    pub left: f64,
    pub top: f64,
    pub width: f64,
}

impl From<GraphPosition> for CoreRect {
    fn from(value: GraphPosition) -> Self {
        Self {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
        }
    }
}

impl From<CoreRect> for GraphPosition {
    fn from(value: CoreRect) -> Self {
        Self {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct PassageSnapshot {
    pub id: String,
    #[serde(default)]
    pub layout: Option<CoreRect>,
    pub name: String,
    pub story_id: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub text: String,
}

impl PassageSnapshot {
    fn into_passage(self, story_id: &StoryId) -> Passage {
        Passage {
            custom_attributes: BTreeMap::new(),
            id: PassageId::new(self.id),
            layout: self.layout.map(GraphPosition::from),
            metadata: BTreeMap::new(),
            name: self.name,
            source_pid: None,
            story: story_id.clone(),
            tags: self.tags,
            text: self.text,
        }
    }
}

impl From<&Passage> for PassageSnapshot {
    fn from(value: &Passage) -> Self {
        Self {
            id: value.id.as_ref().to_owned(),
            layout: value.layout.map(CoreRect::from),
            name: value.name.clone(),
            story_id: value.story.as_ref().to_owned(),
            tags: value.tags.clone(),
            text: value.text.clone(),
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct StorySnapshot {
    pub id: String,
    pub ifid: String,
    pub name: String,
    pub passages: Vec<PassageSnapshot>,
    pub script: String,
    pub start_passage_id: String,
    pub story_format: String,
    pub story_format_version: String,
    pub stylesheet: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub enum CoreSourceKind {
    Passage,
    Script,
    Stylesheet,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreSourceFile {
    pub character_count: usize,
    pub id: String,
    pub kind: CoreSourceKind,
    pub line_count: usize,
    pub name: String,
    #[serde(default)]
    pub passage_id: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub enum CoreSearchScope {
    PassageName,
    PassageText,
    PassageTag,
    Script,
    Stylesheet,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreSearchHit {
    pub excerpt: String,
    pub line: usize,
    pub scope: CoreSearchScope,
    pub source_id: String,
    pub source_name: String,
    pub start: usize,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub enum CoreDiagnosticSeverity {
    Info,
    Warning,
    Error,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreDiagnostic {
    pub code: String,
    pub message: String,
    #[serde(default)]
    pub passage_id: Option<String>,
    pub severity: CoreDiagnosticSeverity,
    pub source_id: String,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreStoryIndexOptions {
    #[serde(default)]
    pub query: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreStoryIndex {
    pub diagnostics: Vec<CoreDiagnostic>,
    pub files: Vec<CoreSourceFile>,
    pub graph: CoreGraphStats,
    pub search_hits: Vec<CoreSearchHit>,
    pub story_id: String,
    pub tags: Vec<String>,
}

impl From<&Story> for StorySnapshot {
    fn from(value: &Story) -> Self {
        Self {
            id: value.id.as_ref().to_owned(),
            ifid: value.ifid.clone(),
            name: value.name.clone(),
            passages: value.passages.iter().map(PassageSnapshot::from).collect(),
            script: value.script.clone(),
            start_passage_id: value.start_passage.as_ref().to_owned(),
            story_format: value.story_format.clone(),
            story_format_version: value.story_format_version.clone(),
            stylesheet: value.stylesheet.clone(),
            tags: value.tags.clone(),
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct ProjectSnapshot {
    pub dirty: bool,
    pub name: String,
    pub schema_version: u32,
    pub stories: Vec<StorySnapshot>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct PassageMove {
    pub passage_id: String,
    pub bounds: CoreRect,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct PassagePatch {
    #[serde(default)]
    pub layout: Option<CoreRect>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub tags: Option<Vec<String>>,
    #[serde(default)]
    pub text: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub enum CoreGraphDirection {
    Incoming,
    Outgoing,
    Both,
}

impl From<CoreGraphDirection> for GraphDirection {
    fn from(value: CoreGraphDirection) -> Self {
        match value {
            CoreGraphDirection::Incoming => Self::Incoming,
            CoreGraphDirection::Outgoing => Self::Outgoing,
            CoreGraphDirection::Both => Self::Both,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub enum CoreGraphEdgeKind {
    Resolved,
    Broken,
    SelfLink,
}

impl From<GraphEdgeKind> for CoreGraphEdgeKind {
    fn from(value: GraphEdgeKind) -> Self {
        match value {
            GraphEdgeKind::Resolved => Self::Resolved,
            GraphEdgeKind::Broken => Self::Broken,
            GraphEdgeKind::SelfLink => Self::SelfLink,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub enum CoreGraphLayoutSource {
    Saved,
    Generated,
}

impl From<GraphLayoutSource> for CoreGraphLayoutSource {
    fn from(value: GraphLayoutSource) -> Self {
        match value {
            GraphLayoutSource::Saved => Self::Saved,
            GraphLayoutSource::Generated => Self::Generated,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub enum CoreGraphLayoutState {
    Saved,
    Generated,
    Mixed,
    Partial,
    Missing,
}

impl From<GraphLayoutState> for CoreGraphLayoutState {
    fn from(value: GraphLayoutState) -> Self {
        match value {
            GraphLayoutState::Saved => Self::Saved,
            GraphLayoutState::Generated => Self::Generated,
            GraphLayoutState::Mixed => Self::Mixed,
            GraphLayoutState::Partial => Self::Partial,
            GraphLayoutState::Missing => Self::Missing,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreLinkLayerOptions {
    #[serde(default = "default_true")]
    pub broken: bool,
    #[serde(default = "default_true")]
    pub resolved: bool,
    #[serde(default = "default_true")]
    pub self_links: bool,
}

impl From<CoreLinkLayerOptions> for LinkLayerOptions {
    fn from(value: CoreLinkLayerOptions) -> Self {
        Self {
            broken: value.broken,
            resolved: value.resolved,
            self_links: value.self_links,
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreGraphFocus {
    pub direction: CoreGraphDirection,
    pub passage_ids: Vec<String>,
    pub radius: usize,
}

impl From<CoreGraphFocus> for GraphFocus {
    fn from(value: CoreGraphFocus) -> Self {
        Self {
            direction: value.direction.into(),
            passage_ids: value.passage_ids.into_iter().map(PassageId::new).collect(),
            radius: value.radius,
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreGraphProjectionOptions {
    #[serde(default)]
    pub focus: Option<CoreGraphFocus>,
    #[serde(default)]
    pub layers: CoreLinkLayerOptions,
    #[serde(default)]
    pub viewport: Option<CoreRect>,
}

impl From<CoreGraphProjectionOptions> for GraphProjectionOptions {
    fn from(value: CoreGraphProjectionOptions) -> Self {
        Self {
            focus: value.focus.map(GraphFocus::from),
            layers: value.layers.into(),
            viewport: value.viewport.map(GraphViewport::from),
            ..GraphProjectionOptions::default()
        }
    }
}

impl From<CoreRect> for GraphViewport {
    fn from(value: CoreRect) -> Self {
        Self {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreGraphNode {
    pub bounds: CoreRect,
    pub broken_link_count: usize,
    pub id: String,
    pub incoming_count: usize,
    pub is_empty: bool,
    pub is_orphan: bool,
    pub is_start: bool,
    pub is_unreachable: bool,
    pub layout_source: CoreGraphLayoutSource,
    pub name: String,
    pub outgoing_count: usize,
    pub self_link_count: usize,
    pub tags: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreGraphEdge {
    pub kind: CoreGraphEdgeKind,
    pub source_bounds: CoreRect,
    pub source_id: String,
    #[serde(default)]
    pub target_bounds: Option<CoreRect>,
    #[serde(default)]
    pub target_id: Option<String>,
    pub target_name: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreGraphStats {
    pub broken_links: usize,
    pub empty_passages: usize,
    pub links: usize,
    pub orphan_passages: usize,
    pub passages: usize,
    pub resolved_links: usize,
    pub self_links: usize,
    pub tagged_passages: usize,
    pub unreachable_passages: usize,
}

impl From<twine_graph::GraphStats> for CoreGraphStats {
    fn from(value: twine_graph::GraphStats) -> Self {
        Self {
            broken_links: value.broken_links,
            empty_passages: value.empty_passages,
            links: value.links,
            orphan_passages: value.orphan_passages,
            passages: value.passages,
            resolved_links: value.resolved_links,
            self_links: value.self_links,
            tagged_passages: value.tagged_passages,
            unreachable_passages: value.unreachable_passages,
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct CoreGraphProjection {
    #[serde(default)]
    pub bounds: Option<CoreRect>,
    pub edges: Vec<CoreGraphEdge>,
    pub layout_state: CoreGraphLayoutState,
    pub nodes: Vec<CoreGraphNode>,
    pub stats: CoreGraphStats,
}

impl From<twine_graph::GraphProjection> for CoreGraphProjection {
    fn from(value: twine_graph::GraphProjection) -> Self {
        Self {
            bounds: value.bounds.map(CoreRect::from),
            edges: value
                .edges
                .into_iter()
                .map(|edge| CoreGraphEdge {
                    kind: edge.kind.into(),
                    source_bounds: edge.source_bounds.into(),
                    source_id: edge.source.as_ref().to_owned(),
                    target_bounds: edge.target_bounds.map(CoreRect::from),
                    target_id: edge.target.map(|id| id.as_ref().to_owned()),
                    target_name: edge.target_name,
                })
                .collect(),
            layout_state: value.layout_state.into(),
            nodes: value
                .nodes
                .into_iter()
                .map(|node| CoreGraphNode {
                    bounds: node.bounds.into(),
                    broken_link_count: node.broken_link_count,
                    id: node.id.as_ref().to_owned(),
                    incoming_count: node.incoming_count,
                    is_empty: node.is_empty,
                    is_orphan: node.is_orphan,
                    is_start: node.is_start,
                    is_unreachable: node.is_unreachable,
                    layout_source: node.layout_source.into(),
                    name: node.name,
                    outgoing_count: node.outgoing_count,
                    self_link_count: node.self_link_count,
                    tags: node.tags,
                })
                .collect(),
            stats: value.stats.into(),
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase", tag = "type")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub enum StoryCommand {
    Batch {
        commands: Vec<StoryCommand>,
    },
    CreatePassage {
        #[serde(default)]
        id: Option<String>,
        #[serde(default)]
        layout: Option<CoreRect>,
        #[serde(default)]
        name: Option<String>,
        story_id: String,
        #[serde(default)]
        tags: Vec<String>,
        #[serde(default)]
        text: String,
    },
    DeletePassages {
        passage_ids: Vec<String>,
        story_id: String,
    },
    MarkSaved,
    MovePassages {
        moves: Vec<PassageMove>,
        story_id: String,
    },
    QueryGraphProjection {
        options: CoreGraphProjectionOptions,
        story_id: String,
    },
    QueryStoryIndex {
        options: CoreStoryIndexOptions,
        story_id: String,
    },
    RenamePassage {
        name: String,
        passage_id: String,
        story_id: String,
        #[serde(default = "default_true")]
        update_references: bool,
    },
    RestorePassages {
        passages: Vec<PassageSnapshot>,
        story_id: String,
    },
    SetPassageTags {
        passage_id: String,
        story_id: String,
        tags: Vec<String>,
    },
    SetStartPassage {
        passage_id: String,
        story_id: String,
    },
    SaveGeneratedLayout {
        story_id: String,
    },
    UpdatePassageText {
        passage_id: String,
        story_id: String,
        text: String,
    },
    UpdateStoryScript {
        script: String,
        story_id: String,
    },
    UpdateStoryStylesheet {
        story_id: String,
        stylesheet: String,
    },
}

impl StoryCommand {
    fn label(&self) -> &'static str {
        match self {
            Self::Batch { .. } => "Batch",
            Self::CreatePassage { .. } => "New Passage",
            Self::DeletePassages { .. } => "Delete Passages",
            Self::MarkSaved => "Mark Saved",
            Self::MovePassages { .. } => "Move Passages",
            Self::QueryGraphProjection { .. } => "Query Graph",
            Self::QueryStoryIndex { .. } => "Query Story Index",
            Self::RenamePassage { .. } => "Rename Passage",
            Self::RestorePassages { .. } => "Restore Passages",
            Self::SaveGeneratedLayout { .. } => "Save Layout",
            Self::SetPassageTags { .. } => "Set Passage Tags",
            Self::SetStartPassage { .. } => "Set Start Passage",
            Self::UpdatePassageText { .. } => "Update Passage Text",
            Self::UpdateStoryScript { .. } => "Update Story JavaScript",
            Self::UpdateStoryStylesheet { .. } => "Update Story Stylesheet",
        }
    }

    fn mutates_project(&self) -> bool {
        !matches!(
            self,
            Self::QueryGraphProjection { .. } | Self::QueryStoryIndex { .. }
        )
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase", tag = "type")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub enum Patch {
    DirtyStateChanged {
        dirty: bool,
    },
    GraphProjectionUpdated {
        projection: CoreGraphProjection,
        story_id: String,
    },
    LayoutSaved {
        projection: CoreGraphProjection,
        story_id: String,
    },
    PassageCreated {
        passage: PassageSnapshot,
        story_id: String,
    },
    PassageDeleted {
        passage_id: String,
        story_id: String,
    },
    PassageUpdated {
        changes: PassagePatch,
        passage_id: String,
        story_id: String,
    },
    ProjectSnapshotReplaced {
        snapshot: ProjectSnapshot,
    },
    StartPassageChanged {
        passage_id: String,
        story_id: String,
    },
    StoryIndexUpdated {
        index: CoreStoryIndex,
        story_id: String,
    },
    StoryScriptUpdated {
        script: String,
        story_id: String,
    },
    StoryStylesheetUpdated {
        story_id: String,
        stylesheet: String,
    },
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../../../src/core/bindings/")]
pub struct PatchBatch {
    pub label: String,
    pub patches: Vec<Patch>,
    pub transaction_id: u64,
}

#[derive(Clone, Debug, Error, PartialEq)]
pub enum CoreError {
    #[error("duplicate passage name: {0}")]
    DuplicatePassageName(String),

    #[error("passage not found: {0}")]
    PassageNotFound(String),

    #[error("story not found: {0}")]
    StoryNotFound(String),
}

#[derive(Clone, Debug)]
struct Transaction {
    after: Project,
    before: Project,
    dirty_after: bool,
    dirty_before: bool,
    id: u64,
    label: String,
}

#[derive(Clone, Debug)]
pub struct ProjectSession {
    dirty: bool,
    next_transaction_id: u64,
    project: Project,
    redo_stack: Vec<Transaction>,
    undo_stack: Vec<Transaction>,
}

impl ProjectSession {
    pub fn new(project: Project) -> Self {
        Self {
            dirty: false,
            next_transaction_id: 1,
            project,
            redo_stack: Vec::new(),
            undo_stack: Vec::new(),
        }
    }

    pub fn apply(&mut self, command: StoryCommand) -> Result<PatchBatch, CoreError> {
        let before = self.project.clone();
        let dirty_before = self.dirty;
        let transaction_id = self.next_transaction_id;
        self.next_transaction_id += 1;
        let mut patches = self.apply_without_transaction(command.clone())?;

        if command.mutates_project() {
            self.dirty = !matches!(command, StoryCommand::MarkSaved);
            push_dirty_patch(&mut patches, dirty_before, self.dirty);
            self.undo_stack.push(Transaction {
                after: self.project.clone(),
                before,
                dirty_after: self.dirty,
                dirty_before,
                id: transaction_id,
                label: command.label().into(),
            });
            self.redo_stack.clear();
        }

        Ok(PatchBatch {
            label: command.label().into(),
            patches,
            transaction_id,
        })
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn dirty(&self) -> bool {
        self.dirty
    }

    pub fn project(&self) -> &Project {
        &self.project
    }

    pub fn redo(&mut self) -> Option<PatchBatch> {
        let transaction = self.redo_stack.pop()?;

        self.project = transaction.after.clone();
        self.dirty = transaction.dirty_after;
        self.undo_stack.push(transaction.clone());
        Some(PatchBatch {
            label: transaction.label,
            patches: vec![Patch::ProjectSnapshotReplaced {
                snapshot: self.snapshot(),
            }],
            transaction_id: transaction.id,
        })
    }

    pub fn snapshot(&self) -> ProjectSnapshot {
        ProjectSnapshot {
            dirty: self.dirty,
            name: self.project.manifest.name.clone(),
            schema_version: self.project.manifest.schema_version,
            stories: self
                .project
                .stories
                .iter()
                .map(StorySnapshot::from)
                .collect(),
        }
    }

    pub fn undo(&mut self) -> Option<PatchBatch> {
        let transaction = self.undo_stack.pop()?;

        self.project = transaction.before.clone();
        self.dirty = transaction.dirty_before;
        self.redo_stack.push(transaction.clone());
        Some(PatchBatch {
            label: format!("Undo {}", transaction.label),
            patches: vec![Patch::ProjectSnapshotReplaced {
                snapshot: self.snapshot(),
            }],
            transaction_id: transaction.id,
        })
    }

    fn apply_without_transaction(
        &mut self,
        command: StoryCommand,
    ) -> Result<Vec<Patch>, CoreError> {
        match command {
            StoryCommand::Batch { commands } => {
                let mut patches = Vec::new();

                for command in commands {
                    patches.extend(self.apply_without_transaction(command)?);
                }

                Ok(patches)
            }
            StoryCommand::CreatePassage {
                id,
                layout,
                name,
                story_id,
                tags,
                text,
            } => self.create_passage(story_id, id, name, text, tags, layout),
            StoryCommand::DeletePassages {
                story_id,
                passage_ids,
            } => self.delete_passages(&story_id, &passage_ids),
            StoryCommand::MarkSaved => {
                self.dirty = false;
                Ok(Vec::new())
            }
            StoryCommand::MovePassages { story_id, moves } => self.move_passages(&story_id, moves),
            StoryCommand::QueryGraphProjection { story_id, options } => {
                let projection = self.graph_projection(&story_id, options)?;

                Ok(vec![Patch::GraphProjectionUpdated {
                    projection,
                    story_id,
                }])
            }
            StoryCommand::QueryStoryIndex { story_id, options } => {
                let index = self.story_index(&story_id, options)?;

                Ok(vec![Patch::StoryIndexUpdated { index, story_id }])
            }
            StoryCommand::RenamePassage {
                name,
                passage_id,
                story_id,
                update_references,
            } => self.rename_passage(&story_id, &passage_id, name, update_references),
            StoryCommand::RestorePassages { story_id, passages } => {
                self.restore_passages(&story_id, passages)
            }
            StoryCommand::SaveGeneratedLayout { story_id } => self.save_generated_layout(&story_id),
            StoryCommand::SetPassageTags {
                passage_id,
                story_id,
                tags,
            } => self.set_passage_tags(&story_id, &passage_id, tags),
            StoryCommand::SetStartPassage {
                passage_id,
                story_id,
            } => self.set_start_passage(&story_id, &passage_id),
            StoryCommand::UpdatePassageText {
                passage_id,
                story_id,
                text,
            } => self.update_passage_text(&story_id, &passage_id, text),
            StoryCommand::UpdateStoryScript { script, story_id } => {
                self.update_story_script(&story_id, script)
            }
            StoryCommand::UpdateStoryStylesheet {
                story_id,
                stylesheet,
            } => self.update_story_stylesheet(&story_id, stylesheet),
        }
    }

    fn create_passage(
        &mut self,
        story_id: String,
        id: Option<String>,
        name: Option<String>,
        text: String,
        tags: Vec<String>,
        layout: Option<CoreRect>,
    ) -> Result<Vec<Patch>, CoreError> {
        let story = self.story_mut(&story_id)?;
        let id = PassageId::new(id.unwrap_or_else(|| next_passage_id(story)));
        let name = name.unwrap_or_else(|| unique_passage_name(story, "Untitled Passage"));

        if story.passages.id_for_name(&name).is_some() {
            return Err(CoreError::DuplicatePassageName(name));
        }

        let passage = Passage {
            custom_attributes: BTreeMap::new(),
            id: id.clone(),
            layout: layout.map(GraphPosition::from),
            metadata: BTreeMap::new(),
            name,
            source_pid: None,
            story: story.id.clone(),
            tags,
            text,
        };

        story.passages.insert(passage.clone());
        if story.start_passage.as_ref().is_empty() {
            story.start_passage = id;
        }

        Ok(vec![Patch::PassageCreated {
            passage: PassageSnapshot::from(&passage),
            story_id,
        }])
    }

    fn delete_passages(
        &mut self,
        story_id: &str,
        passage_ids: &[String],
    ) -> Result<Vec<Patch>, CoreError> {
        let ids = passage_ids
            .iter()
            .map(PassageId::new)
            .collect::<BTreeSet<_>>();
        let story = self.story_mut(story_id)?;
        let existing_ids = story
            .passages
            .iter()
            .map(|passage| passage.id.clone())
            .collect::<BTreeSet<_>>();

        if let Some(missing) = ids.iter().find(|id| !existing_ids.contains(*id)) {
            return Err(CoreError::PassageNotFound(missing.as_ref().to_owned()));
        }

        let remaining = story
            .passages
            .iter()
            .filter(|passage| !ids.contains(&passage.id))
            .cloned()
            .collect::<Vec<_>>();

        story.passages = PassageIndex::from(remaining);

        if ids.contains(&story.start_passage) {
            story.start_passage = story
                .passages
                .first()
                .map(|passage| passage.id.clone())
                .unwrap_or_default();
        }

        Ok(passage_ids
            .iter()
            .map(|passage_id| Patch::PassageDeleted {
                passage_id: passage_id.clone(),
                story_id: story_id.to_owned(),
            })
            .collect())
    }

    fn graph_projection(
        &self,
        story_id: &str,
        options: CoreGraphProjectionOptions,
    ) -> Result<CoreGraphProjection, CoreError> {
        let story = self.story(story_id)?;
        let graph = GraphIndex::from_story(story);
        let projection = graph.canvas_projection(
            story,
            &self.project.layout,
            &AutoLayoutOptions::default(),
            &options.into(),
        );

        Ok(projection.into())
    }

    fn save_generated_layout(&mut self, story_id: &str) -> Result<Vec<Patch>, CoreError> {
        let snapshot = {
            let story = self.story(story_id)?;
            let graph = GraphIndex::from_story(story);

            graph.layout_snapshot(story, &self.project.layout, &AutoLayoutOptions::default())
        };
        let mut patches = Vec::new();

        for (passage_id, entry) in snapshot.passages {
            self.project.layout.passages.insert(
                passage_id.clone(),
                PassageLayout {
                    bounds: entry.bounds,
                    ..PassageLayout::default()
                },
            );

            {
                let story = self.story_mut(story_id)?;
                let passage = story
                    .passage_by_id_mut(&passage_id)
                    .ok_or_else(|| CoreError::PassageNotFound(passage_id.as_ref().to_owned()))?;

                if passage.layout == Some(entry.bounds) {
                    continue;
                }

                passage.layout = Some(entry.bounds);
            }

            patches.push(Patch::PassageUpdated {
                changes: PassagePatch {
                    layout: Some(entry.bounds.into()),
                    ..PassagePatch::default()
                },
                passage_id: passage_id.as_ref().to_owned(),
                story_id: story_id.to_owned(),
            });
        }

        let projection = self.graph_projection(story_id, CoreGraphProjectionOptions::default())?;

        patches.push(Patch::LayoutSaved {
            projection,
            story_id: story_id.to_owned(),
        });
        Ok(patches)
    }

    fn move_passages(
        &mut self,
        story_id: &str,
        moves: Vec<PassageMove>,
    ) -> Result<Vec<Patch>, CoreError> {
        let mut patches = Vec::new();

        for passage_move in moves {
            let passage_id = PassageId::new(&passage_move.passage_id);
            let bounds = GraphPosition::from(passage_move.bounds);

            {
                let story = self.story_mut(story_id)?;
                let passage = story
                    .passage_by_id_mut(&passage_id)
                    .ok_or_else(|| CoreError::PassageNotFound(passage_move.passage_id.clone()))?;

                passage.layout = Some(bounds);
            }

            self.project.layout.passages.insert(
                passage_id,
                PassageLayout {
                    bounds,
                    ..PassageLayout::default()
                },
            );
            patches.push(Patch::PassageUpdated {
                changes: PassagePatch {
                    layout: Some(bounds.into()),
                    ..PassagePatch::default()
                },
                passage_id: passage_move.passage_id,
                story_id: story_id.to_owned(),
            });
        }

        Ok(patches)
    }

    fn rename_passage(
        &mut self,
        story_id: &str,
        passage_id: &str,
        name: String,
        update_references: bool,
    ) -> Result<Vec<Patch>, CoreError> {
        let story = self.story_mut(story_id)?;
        let passage_id = PassageId::new(passage_id);

        if story
            .passages
            .id_for_name(&name)
            .is_some_and(|existing_id| existing_id != &passage_id)
        {
            return Err(CoreError::DuplicatePassageName(name));
        }

        let passage = story
            .passage_by_id_mut(&passage_id)
            .ok_or_else(|| CoreError::PassageNotFound(passage_id.as_ref().to_owned()))?;
        let old_name = std::mem::replace(&mut passage.name, name.clone());
        let mut patches = vec![Patch::PassageUpdated {
            changes: PassagePatch {
                name: Some(name.clone()),
                ..PassagePatch::default()
            },
            passage_id: passage_id.as_ref().to_owned(),
            story_id: story_id.to_owned(),
        }];

        story.passages.rebuild_name_index();

        if update_references {
            for passage in story.passages.iter_mut() {
                let rewritten = replace_standard_link_targets(&passage.text, &old_name, &name);

                if rewritten != passage.text {
                    passage.text = rewritten;
                    patches.push(Patch::PassageUpdated {
                        changes: PassagePatch {
                            text: Some(passage.text.clone()),
                            ..PassagePatch::default()
                        },
                        passage_id: passage.id.as_ref().to_owned(),
                        story_id: story_id.to_owned(),
                    });
                }
            }
        }

        Ok(patches)
    }

    fn restore_passages(
        &mut self,
        story_id: &str,
        passages: Vec<PassageSnapshot>,
    ) -> Result<Vec<Patch>, CoreError> {
        let story = self.story_mut(story_id)?;
        let story_id_model = story.id.clone();
        let mut patches = Vec::new();

        for passage in passages {
            let restored = passage.into_passage(&story_id_model);

            story.passages.insert(restored.clone());
            patches.push(Patch::PassageCreated {
                passage: PassageSnapshot::from(&restored),
                story_id: story_id.to_owned(),
            });
        }

        Ok(patches)
    }

    fn set_passage_tags(
        &mut self,
        story_id: &str,
        passage_id: &str,
        tags: Vec<String>,
    ) -> Result<Vec<Patch>, CoreError> {
        let story = self.story_mut(story_id)?;
        let passage_id = PassageId::new(passage_id);
        let passage = story
            .passage_by_id_mut(&passage_id)
            .ok_or_else(|| CoreError::PassageNotFound(passage_id.as_ref().to_owned()))?;

        passage.tags = tags.clone();
        Ok(vec![Patch::PassageUpdated {
            changes: PassagePatch {
                tags: Some(tags),
                ..PassagePatch::default()
            },
            passage_id: passage_id.as_ref().to_owned(),
            story_id: story_id.to_owned(),
        }])
    }

    fn set_start_passage(
        &mut self,
        story_id: &str,
        passage_id: &str,
    ) -> Result<Vec<Patch>, CoreError> {
        let story = self.story_mut(story_id)?;
        let passage_id = PassageId::new(passage_id);

        if story.passage_by_id(&passage_id).is_none() {
            return Err(CoreError::PassageNotFound(passage_id.as_ref().to_owned()));
        }

        story.start_passage = passage_id.clone();
        Ok(vec![Patch::StartPassageChanged {
            passage_id: passage_id.as_ref().to_owned(),
            story_id: story_id.to_owned(),
        }])
    }

    fn story_index(
        &self,
        story_id: &str,
        options: CoreStoryIndexOptions,
    ) -> Result<CoreStoryIndex, CoreError> {
        let story = self.story(story_id)?;
        let graph = GraphIndex::from_story(story);
        let mut diagnostics = Vec::new();
        let mut files = Vec::new();
        let mut tags = BTreeSet::new();
        let mut search_hits = Vec::new();
        let query = options.query.unwrap_or_default();

        for passage in story.passages.iter() {
            for tag in &passage.tags {
                tags.insert(tag.clone());
            }

            files.push(CoreSourceFile {
                character_count: passage.text.len(),
                id: passage.id.as_ref().to_owned(),
                kind: CoreSourceKind::Passage,
                line_count: line_count(&passage.text),
                name: passage.name.clone(),
                passage_id: Some(passage.id.as_ref().to_owned()),
                tags: passage.tags.clone(),
            });

            search_hits.extend(search_hits_in_source(
                &query,
                passage.id.as_ref(),
                &passage.name,
                &passage.name,
                CoreSearchScope::PassageName,
            ));
            search_hits.extend(search_hits_in_source(
                &query,
                passage.id.as_ref(),
                &passage.name,
                &passage.text,
                CoreSearchScope::PassageText,
            ));

            for tag in &passage.tags {
                search_hits.extend(search_hits_in_source(
                    &query,
                    passage.id.as_ref(),
                    &passage.name,
                    tag,
                    CoreSearchScope::PassageTag,
                ));
            }
        }

        files.push(CoreSourceFile {
            character_count: story.script.len(),
            id: format!("{}:script", story.id.as_ref()),
            kind: CoreSourceKind::Script,
            line_count: line_count(&story.script),
            name: "Story JavaScript".into(),
            passage_id: None,
            tags: Vec::new(),
        });
        files.push(CoreSourceFile {
            character_count: story.stylesheet.len(),
            id: format!("{}:stylesheet", story.id.as_ref()),
            kind: CoreSourceKind::Stylesheet,
            line_count: line_count(&story.stylesheet),
            name: "Story Stylesheet".into(),
            passage_id: None,
            tags: Vec::new(),
        });

        search_hits.extend(search_hits_in_source(
            &query,
            &format!("{}:script", story.id.as_ref()),
            "Story JavaScript",
            &story.script,
            CoreSearchScope::Script,
        ));
        search_hits.extend(search_hits_in_source(
            &query,
            &format!("{}:stylesheet", story.id.as_ref()),
            "Story Stylesheet",
            &story.stylesheet,
            CoreSearchScope::Stylesheet,
        ));

        for broken_link in graph.broken_links() {
            diagnostics.push(CoreDiagnostic {
                code: "broken-link".into(),
                message: format!("Broken link to \"{}\"", broken_link.target_name),
                passage_id: Some(broken_link.source.as_ref().to_owned()),
                severity: CoreDiagnosticSeverity::Warning,
                source_id: broken_link.source.as_ref().to_owned(),
            });
        }

        for node in graph.nodes() {
            if node.is_unreachable {
                diagnostics.push(CoreDiagnostic {
                    code: "unreachable-passage".into(),
                    message: "Passage is not reachable from the start passage".into(),
                    passage_id: Some(node.id.as_ref().to_owned()),
                    severity: CoreDiagnosticSeverity::Info,
                    source_id: node.id.as_ref().to_owned(),
                });
            }
        }

        Ok(CoreStoryIndex {
            diagnostics,
            files,
            graph: graph.stats().clone().into(),
            search_hits,
            story_id: story_id.to_owned(),
            tags: tags.into_iter().collect(),
        })
    }

    fn story(&self, story_id: &str) -> Result<&Story, CoreError> {
        self.project
            .stories
            .iter()
            .find(|story| story.id.as_ref() == story_id)
            .ok_or_else(|| CoreError::StoryNotFound(story_id.to_owned()))
    }

    fn story_mut(&mut self, story_id: &str) -> Result<&mut Story, CoreError> {
        self.project
            .stories
            .iter_mut()
            .find(|story| story.id.as_ref() == story_id)
            .ok_or_else(|| CoreError::StoryNotFound(story_id.to_owned()))
    }

    fn update_passage_text(
        &mut self,
        story_id: &str,
        passage_id: &str,
        text: String,
    ) -> Result<Vec<Patch>, CoreError> {
        let story = self.story_mut(story_id)?;
        let passage_id = PassageId::new(passage_id);
        let passage = story
            .passage_by_id_mut(&passage_id)
            .ok_or_else(|| CoreError::PassageNotFound(passage_id.as_ref().to_owned()))?;

        if passage.text == text {
            return Ok(Vec::new());
        }

        passage.text = text.clone();
        Ok(vec![Patch::PassageUpdated {
            changes: PassagePatch {
                text: Some(text),
                ..PassagePatch::default()
            },
            passage_id: passage_id.as_ref().to_owned(),
            story_id: story_id.to_owned(),
        }])
    }

    fn update_story_script(
        &mut self,
        story_id: &str,
        script: String,
    ) -> Result<Vec<Patch>, CoreError> {
        let story = self.story_mut(story_id)?;

        if story.script == script {
            return Ok(Vec::new());
        }

        story.script = script.clone();
        Ok(vec![Patch::StoryScriptUpdated {
            script,
            story_id: story_id.to_owned(),
        }])
    }

    fn update_story_stylesheet(
        &mut self,
        story_id: &str,
        stylesheet: String,
    ) -> Result<Vec<Patch>, CoreError> {
        let story = self.story_mut(story_id)?;

        if story.stylesheet == stylesheet {
            return Ok(Vec::new());
        }

        story.stylesheet = stylesheet.clone();
        Ok(vec![Patch::StoryStylesheetUpdated {
            story_id: story_id.to_owned(),
            stylesheet,
        }])
    }
}

fn default_true() -> bool {
    true
}

fn next_passage_id(story: &Story) -> String {
    let mut suffix = story.passage_count() + 1;

    loop {
        let candidate = format!("passage-{suffix}");

        if story
            .passages
            .iter()
            .all(|passage| passage.id.as_ref() != candidate)
        {
            return candidate;
        }

        suffix += 1;
    }
}

fn push_dirty_patch(patches: &mut Vec<Patch>, before: bool, after: bool) {
    if before != after {
        patches.push(Patch::DirtyStateChanged { dirty: after });
    }
}

fn line_count(text: &str) -> usize {
    text.lines().count().max(1)
}

fn search_hits_in_source(
    query: &str,
    source_id: &str,
    source_name: &str,
    source: &str,
    scope: CoreSearchScope,
) -> Vec<CoreSearchHit> {
    let query = query.trim();

    if query.is_empty() {
        return Vec::new();
    }

    let haystack = source.to_ascii_lowercase();
    let needle = query.to_ascii_lowercase();
    let mut cursor = 0;
    let mut hits = Vec::new();

    while let Some(offset) = haystack[cursor..].find(&needle) {
        let start = cursor + offset;

        hits.push(CoreSearchHit {
            excerpt: excerpt_around(source, start, query.len()),
            line: source[..start]
                .chars()
                .filter(|character| *character == '\n')
                .count()
                + 1,
            scope: scope.clone(),
            source_id: source_id.to_owned(),
            source_name: source_name.to_owned(),
            start,
        });
        cursor = start + needle.len().max(1);
    }

    hits
}

fn excerpt_around(source: &str, start: usize, length: usize) -> String {
    let line_start = source[..start].rfind('\n').map_or(0, |index| index + 1);
    let line_end = source[start..]
        .find('\n')
        .map_or(source.len(), |index| start + index);
    let excerpt = source[line_start..line_end].trim();

    if excerpt.len() <= 140 {
        return excerpt.into();
    }

    let window_start = start.saturating_sub(48).max(line_start);
    let window_end = (start + length + 48).min(line_end);
    let mut result = String::new();

    if window_start > line_start {
        result.push_str("...");
    }

    result.push_str(source[window_start..window_end].trim());

    if window_end < line_end {
        result.push_str("...");
    }

    result
}

fn unique_passage_name(story: &Story, base: &str) -> String {
    if story.passages.id_for_name(base).is_none() {
        return base.into();
    }

    for suffix in 2.. {
        let candidate = format!("{base} {suffix}");

        if story.passages.id_for_name(&candidate).is_none() {
            return candidate;
        }
    }

    unreachable!("infinite iterator should return");
}

fn replace_standard_link_targets(text: &str, old_name: &str, new_name: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut cursor = 0;

    while let Some(open_offset) = text[cursor..].find("[[") {
        let open = cursor + open_offset;
        let content_start = open + 2;
        let Some(close_offset) = text[content_start..].find("]]") else {
            break;
        };
        let close = content_start + close_offset;
        let content = &text[content_start..close];

        result.push_str(&text[cursor..open]);
        result.push_str("[[");
        result.push_str(&replace_link_content_target(content, old_name, new_name));
        result.push_str("]]");
        cursor = close + 2;
    }

    result.push_str(&text[cursor..]);
    result
}

fn replace_link_content_target(content: &str, old_name: &str, new_name: &str) -> String {
    let (editable, setter) = content
        .split_once("][")
        .map_or((content, ""), |(editable, setter)| (editable, setter));
    let setter = if setter.is_empty() {
        String::new()
    } else {
        format!("][{setter}")
    };

    if let Some((label, target)) = editable.rsplit_once("->") {
        if target.trim() == old_name {
            return format!(
                "{label}->{}{}",
                replace_preserving_padding(target, new_name),
                setter
            );
        }
    }

    if let Some((target, label)) = editable.split_once("<-") {
        if target.trim() == old_name {
            return format!(
                "{}<-{label}{setter}",
                replace_preserving_padding(target, new_name)
            );
        }
    }

    if let Some((label, target)) = editable.rsplit_once('|') {
        if target.trim() == old_name {
            return format!(
                "{label}|{}{}",
                replace_preserving_padding(target, new_name),
                setter
            );
        }
    }

    if editable.trim() == old_name {
        return format!(
            "{}{}",
            replace_preserving_padding(editable, new_name),
            setter
        );
    }

    content.into()
}

fn replace_preserving_padding(value: &str, replacement: &str) -> String {
    let leading = value.len() - value.trim_start().len();
    let trailing = value.len() - value.trim_end().len();

    format!(
        "{}{}{}",
        &value[..leading],
        replacement,
        &value[value.len() - trailing..]
    )
}

impl Default for CoreLinkLayerOptions {
    fn default() -> Self {
        Self {
            broken: true,
            resolved: true,
            self_links: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use twine_model::{GraphLayout, ProjectManifest, StoragePolicy};

    const DEFAULT_CARD_WIDTH: f64 = 100.0;
    const DEFAULT_CARD_HEIGHT: f64 = 100.0;

    fn passage(id: &str, name: &str, text: &str, left: f64) -> Passage {
        Passage {
            custom_attributes: BTreeMap::new(),
            id: PassageId::new(id),
            layout: Some(GraphPosition {
                height: DEFAULT_CARD_HEIGHT,
                left,
                top: 0.0,
                width: DEFAULT_CARD_WIDTH,
            }),
            metadata: BTreeMap::new(),
            name: name.into(),
            source_pid: None,
            story: StoryId::new("story-1"),
            tags: Vec::new(),
            text: text.into(),
        }
    }

    fn story() -> Story {
        Story {
            id: StoryId::new("story-1"),
            ifid: "ifid".into(),
            name: "Example".into(),
            passages: vec![
                passage("a", "Start", "[[Next]] [[Label->Next]] [[Next<-Back]]", 0.0),
                passage("b", "Next", "[[Missing]]", 200.0),
                passage("c", "Loose", "", 400.0),
            ]
            .into(),
            start_passage: PassageId::new("a"),
            story_format: "Harlowe".into(),
            story_format_version: "3.3.9".into(),
            ..Story::default()
        }
    }

    fn session() -> ProjectSession {
        ProjectSession::new(Project {
            manifest: ProjectManifest {
                name: "Example".into(),
                storage: StoragePolicy::default(),
                ..ProjectManifest::default()
            },
            stories: vec![story()],
            layout: GraphLayout::from_story_layout(&story()),
            ..Project::default()
        })
    }

    fn source_only_session() -> ProjectSession {
        let mut story = story();
        let passages = story
            .passages
            .iter()
            .cloned()
            .map(|mut passage| {
                passage.layout = None;
                passage
            })
            .collect::<Vec<_>>();

        story.passages = PassageIndex::from(passages);

        ProjectSession::new(Project {
            manifest: ProjectManifest {
                name: "Example".into(),
                storage: StoragePolicy::default(),
                ..ProjectManifest::default()
            },
            stories: vec![story],
            ..Project::default()
        })
    }

    #[test]
    fn applies_text_edit_as_minimal_patch() {
        let mut session = session();
        let batch = session
            .apply(StoryCommand::UpdatePassageText {
                story_id: "story-1".into(),
                passage_id: "b".into(),
                text: "[[Start]]".into(),
            })
            .expect("text update should apply");

        assert_eq!(batch.label, "Update Passage Text");
        assert!(session.dirty());
        assert_eq!(batch.patches.len(), 2);
        assert_eq!(
            batch.patches[0],
            Patch::PassageUpdated {
                story_id: "story-1".into(),
                passage_id: "b".into(),
                changes: PassagePatch {
                    text: Some("[[Start]]".into()),
                    ..PassagePatch::default()
                }
            }
        );
    }

    #[test]
    fn renames_passage_and_standard_references_in_one_transaction() {
        let mut session = session();
        let batch = session
            .apply(StoryCommand::RenamePassage {
                story_id: "story-1".into(),
                passage_id: "b".into(),
                name: "Renamed".into(),
                update_references: true,
            })
            .expect("rename should apply");

        assert_eq!(batch.label, "Rename Passage");
        assert_eq!(batch.patches.len(), 3);
        assert_eq!(
            session
                .story("story-1")
                .expect("story")
                .passage_by_id(&PassageId::new("a"))
                .expect("passage")
                .text,
            "[[Renamed]] [[Label->Renamed]] [[Renamed<-Back]]"
        );

        session.undo().expect("undo should be available");
        assert_eq!(
            session
                .story("story-1")
                .expect("story")
                .passage_by_id(&PassageId::new("b"))
                .expect("passage")
                .name,
            "Next"
        );

        session.redo().expect("redo should be available");
        assert_eq!(
            session
                .story("story-1")
                .expect("story")
                .passage_by_id(&PassageId::new("b"))
                .expect("passage")
                .name,
            "Renamed"
        );
    }

    #[test]
    fn updates_story_sources_as_minimal_patches() {
        let mut session = session();
        let script_batch = session
            .apply(StoryCommand::UpdateStoryScript {
                story_id: "story-1".into(),
                script: "window.storyReady = true;".into(),
            })
            .expect("script update should apply");
        let stylesheet_batch = session
            .apply(StoryCommand::UpdateStoryStylesheet {
                story_id: "story-1".into(),
                stylesheet: "tw-story { color: red; }".into(),
            })
            .expect("stylesheet update should apply");

        assert_eq!(
            script_batch.patches[0],
            Patch::StoryScriptUpdated {
                story_id: "story-1".into(),
                script: "window.storyReady = true;".into(),
            }
        );
        assert_eq!(
            stylesheet_batch.patches[0],
            Patch::StoryStylesheetUpdated {
                story_id: "story-1".into(),
                stylesheet: "tw-story { color: red; }".into(),
            }
        );
    }

    #[test]
    fn returns_graph_projection_patch_without_marking_dirty() {
        let mut session = session();
        let batch = session
            .apply(StoryCommand::QueryGraphProjection {
                story_id: "story-1".into(),
                options: CoreGraphProjectionOptions {
                    viewport: Some(CoreRect {
                        height: 150.0,
                        left: 0.0,
                        top: 0.0,
                        width: 250.0,
                    }),
                    ..CoreGraphProjectionOptions::default()
                },
            })
            .expect("projection should apply");

        assert!(!session.dirty());
        assert_eq!(batch.patches.len(), 1);

        let Patch::GraphProjectionUpdated { projection, .. } = &batch.patches[0] else {
            panic!("expected projection patch");
        };

        assert_eq!(projection.layout_state, CoreGraphLayoutState::Saved);
        assert!(projection.nodes.iter().any(|node| node.id == "a"));
        assert!(
            projection
                .edges
                .iter()
                .any(|edge| edge.target_name == "Next")
        );
    }

    #[test]
    fn returns_story_index_patch_without_marking_dirty() {
        let mut session = session();
        let batch = session
            .apply(StoryCommand::QueryStoryIndex {
                story_id: "story-1".into(),
                options: CoreStoryIndexOptions {
                    query: Some("missing".into()),
                },
            })
            .expect("index query should apply");

        assert!(!session.dirty());
        assert_eq!(batch.patches.len(), 1);

        let Patch::StoryIndexUpdated { index, .. } = &batch.patches[0] else {
            panic!("expected story index patch");
        };

        assert_eq!(index.files.len(), 5);
        assert_eq!(index.graph.broken_links, 1);
        assert!(
            index
                .diagnostics
                .iter()
                .any(|diagnostic| diagnostic.code == "broken-link")
        );
        assert!(
            index
                .search_hits
                .iter()
                .any(|hit| hit.source_name == "Next")
        );
    }

    #[test]
    fn saves_generated_layout_only_on_explicit_command() {
        let mut session = source_only_session();
        let query = session
            .apply(StoryCommand::QueryGraphProjection {
                story_id: "story-1".into(),
                options: CoreGraphProjectionOptions::default(),
            })
            .expect("projection should apply");

        let Patch::GraphProjectionUpdated { projection, .. } = &query.patches[0] else {
            panic!("expected projection patch");
        };

        assert_eq!(projection.layout_state, CoreGraphLayoutState::Generated);
        assert!(session.project.layout.passages.is_empty());

        let save = session
            .apply(StoryCommand::SaveGeneratedLayout {
                story_id: "story-1".into(),
            })
            .expect("layout save should apply");

        assert!(session.dirty());
        assert_eq!(session.project.layout.passages.len(), 3);
        assert!(save.patches.iter().any(|patch| {
            matches!(
                patch,
                Patch::LayoutSaved {
                    projection: CoreGraphProjection {
                        layout_state: CoreGraphLayoutState::Saved,
                        ..
                    },
                    ..
                }
            )
        }));
    }

    #[test]
    fn replaces_link_targets_without_touching_display_text_or_setters() {
        assert_eq!(
            replace_standard_link_targets(
                "[[Old]] [[Display->Old][$x = 1]] [[ Old <-Back]] [[Display|Old]]",
                "Old",
                "New",
            ),
            "[[New]] [[Display->New][$x = 1]] [[ New <-Back]] [[Display|New]]"
        );
    }
}
