import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImportProtocolButton } from '@/components/protocol/ImportProtocolButton';
import Link from 'next/link';
import { Plus, FileText, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Get recent protocols
  const { data: protocols } = await supabase
    .from('protocols')
    .select('id, created_at, weighted_goal_score, viability_score, iteration')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get protocol count
  const { count: totalProtocols } = await supabase
    .from('protocols')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user?.id);

  // Get average scores
  const { data: avgScores } = await supabase
    .from('protocols')
    .select('weighted_goal_score, viability_score')
    .eq('user_id', user?.id);

  const avgGoalScore = avgScores && avgScores.length > 0
    ? avgScores.reduce((sum, p) => sum + (p.weighted_goal_score || 0), 0) / avgScores.length
    : 0;

  const avgViabilityScore = avgScores && avgScores.length > 0
    ? avgScores.reduce((sum, p) => sum + (p.viability_score || 0), 0) / avgScores.length
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your protocol overview.</p>
        </div>
        <div className="flex gap-2">
          <ImportProtocolButton />
          <Link href="/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Protocol
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Protocols</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProtocols || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Goal Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgGoalScore.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Viability</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgViabilityScore.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Protocols */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Protocols</CardTitle>
          <CardDescription>Your latest generated health protocols</CardDescription>
        </CardHeader>
        <CardContent>
          {protocols && protocols.length > 0 ? (
            <div className="space-y-4">
              {protocols.map((protocol) => (
                <Link
                  key={protocol.id}
                  href={`/protocols/${protocol.id}`}
                  className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Protocol {protocol.iteration > 0 ? `(Iteration ${protocol.iteration})` : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(protocol.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>Goal: {protocol.weighted_goal_score?.toFixed(1) || 'N/A'}</p>
                      <p className="text-muted-foreground">
                        Viability: {protocol.viability_score?.toFixed(1) || 'N/A'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No protocols yet. Create your first one!</p>
              <Link href="/create">
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Protocol
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
