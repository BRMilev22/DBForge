<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Insight } from './api'
import { createInsight, fetchInsights, voteInsight } from './api'

const insights = ref<Insight[]>([])
const loading = ref(true)
const tagFilter = ref('')
const error = ref<string | null>(null)
const form = ref({
  title: '',
  summary: '',
  category: 'Product',
  tags: ''
})

const refresh = async () => {
  loading.value = true
  error.value = null
  try {
    const { insights: data } = await fetchInsights(tagFilter.value || undefined)
    insights.value = data
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refresh()
})

const categories = computed(() => {
  const unique = new Set(insights.value.map((insight) => insight.category))
  return Array.from(unique)
})

const addInsight = async () => {
  if (!form.value.title.trim() || !form.value.summary.trim()) return
  try {
    const tags = form.value.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    const payload = {
      title: form.value.title.trim(),
      summary: form.value.summary.trim(),
      category: form.value.category.trim() || 'General',
      tags
    }

    const { insights: data } = await createInsight(payload)
    insights.value = data
    form.value = { title: '', summary: '', category: 'Product', tags: '' }
  } catch (err) {
    error.value = (err as Error).message
  }
}

const upvote = async (insight: Insight) => {
  try {
    const { insight: updated } = await voteInsight(insight.id)
    insights.value = insights.value.map((item) => (item.id === updated.id ? updated : item))
  } catch (err) {
    error.value = (err as Error).message
  }
}
</script>

<template>
  <main>
    <section class="hero">
      <p class="eyebrow">DBForge Showcase · MongoDB + Express + Vue</p>
      <h1>Innovation radar backed by MongoDB</h1>
      <p class="lead">
        Browse and upvote research highlights stored in a DBForge-managed MongoDB cluster. Add your own
        signals to watch the board evolve in real time.
      </p>
      <div class="filters">
        <input
          v-model="tagFilter"
          type="text"
          placeholder="Filter by tag (e.g. ai)"
          @keyup.enter="refresh"
        />
        <button class="ghost" :disabled="loading" @click="refresh">
          {{ loading ? 'Refreshing…' : 'Apply filter' }}
        </button>
      </div>
    </section>

    <section class="panel">
      <header>
        <div>
          <p class="eyebrow">Add an insight</p>
          <p class="muted">Each submission becomes a document in MongoDB through the DbForge client.</p>
        </div>
      </header>
      <form class="grid" @submit.prevent="addInsight">
        <label>
          <span>Title</span>
          <input v-model="form.title" type="text" placeholder="LLM powered support sidekick" required />
        </label>
        <label>
          <span>Category</span>
          <input v-model="form.category" type="text" placeholder="Product" />
        </label>
        <label class="full">
          <span>Summary</span>
          <textarea
            v-model="form.summary"
            rows="3"
            placeholder="Short description of the opportunity..."
            required
          />
        </label>
        <label class="full">
          <span>Tags</span>
          <input v-model="form.tags" type="text" placeholder="ai, productivity" />
        </label>
        <div class="full actions">
          <button class="primary" type="submit">Share insight</button>
        </div>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <section class="list panel">
      <header class="list-header">
        <div>
          <p class="eyebrow">Live board</p>
          <h2>{{ insights.length }} signal{{ insights.length === 1 ? '' : 's' }}</h2>
        </div>
        <div class="chips">
          <span class="chip" v-for="category in categories" :key="category">{{ category }}</span>
        </div>
      </header>

      <div v-if="loading" class="empty">Loading insights…</div>
      <div v-else-if="insights.length === 0" class="empty">No insights yet. Add one above!</div>
      <ul v-else>
        <li v-for="insight in insights" :key="insight.id" class="card">
          <div class="card-body">
            <p class="category">{{ insight.category }}</p>
            <h3>{{ insight.title }}</h3>
            <p class="muted">{{ insight.summary }}</p>
            <div class="tags">
              <span v-for="tag in insight.tags" :key="tag">#{{ tag }}</span>
            </div>
          </div>
          <div class="vote">
            <button class="ghost" @click="upvote(insight)">▲</button>
            <p>{{ insight.votes }}</p>
            <small>votes</small>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>
