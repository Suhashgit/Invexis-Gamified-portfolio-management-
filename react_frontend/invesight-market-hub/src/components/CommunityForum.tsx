
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Plus, 
  TrendingUp, 
  Clock, 
  User,
  Search,
  Filter
} from "lucide-react";

const CommunityForum = () => {
  const [selectedSort, setSelectedSort] = useState("hot");
  const [showNewPost, setShowNewPost] = useState(false);

  const mockPosts = [
    {
      id: 1,
      title: "NVDA Earnings Play - What's Your Strategy?",
      content: "With NVIDIA earnings coming up next week, I'm seeing a lot of unusual options activity. Anyone else positioning for this? The premiums are getting expensive but the potential move could be significant...",
      author: "TechInvestor2024",
      timestamp: "3 hours ago",
      upvotes: 45,
      downvotes: 3,
      comments: 23,
      tags: ["NVDA", "Earnings", "Options"],
      category: "Discussion"
    },
    {
      id: 2,
      title: "Portfolio Review: 25M Tech Heavy - Too Risky?",
      content: "Currently 70% tech allocation with positions in AAPL, GOOGL, MSFT, NVDA, and TSLA. Age 25, stable income. Is this too concentrated? Looking for honest feedback on diversification.",
      author: "YoungInvestor25",
      timestamp: "5 hours ago",
      upvotes: 67,
      downvotes: 8,
      comments: 31,
      tags: ["Portfolio", "Tech", "Diversification"],
      category: "Portfolio Review"
    },
    {
      id: 3,
      title: "Fed Rate Decision Impact - My Predictions",
      content: "Based on recent economic data and Fed communications, here's my take on next week's rate decision and how it might affect different sectors. Banking vs. Tech analysis inside...",
      author: "MacroAnalyst",
      timestamp: "8 hours ago",
      upvotes: 89,
      downvotes: 12,
      comments: 45,
      tags: ["Fed", "Rates", "Macro", "Banking"],
      category: "Analysis"
    },
    {
      id: 4,
      title: "Swing Trading Setup: Cup and Handle on SPY",
      content: "Seeing a potential cup and handle formation on SPY weekly chart. Entry at 485, stop at 475, target 505. Risk/reward looks solid. Thoughts on this technical setup?",
      author: "ChartMaster",
      timestamp: "12 hours ago",
      upvotes: 34,
      downvotes: 7,
      comments: 18,
      tags: ["SPY", "Technical Analysis", "Swing Trading"],
      category: "Trading"
    }
  ];

  const categories = [
    { id: "all", name: "All Posts", count: 156 },
    { id: "discussion", name: "Discussion", count: 45 },
    { id: "analysis", name: "Analysis", count: 23 },
    { id: "portfolio", name: "Portfolio Review", count: 31 },
    { id: "trading", name: "Trading", count: 28 },
    { id: "news", name: "News", count: 29 }
  ];

  const sortOptions = [
    { id: "hot", name: "Hot", icon: TrendingUp },
    { id: "new", name: "New", icon: Clock },
    { id: "top", name: "Top", icon: ThumbsUp }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <MessageSquare className="h-6 w-6 mr-2" />
            Investment Community
          </h1>
          <p className="text-slate-400 mt-1">
            Connect with investors, share strategies, and learn from the community
          </p>
        </div>
        <Button 
          onClick={() => setShowNewPost(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {sortOptions.map((option) => (
            <Button
              key={option.id}
              variant={selectedSort === option.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSort(option.id)}
              className={selectedSort === option.id 
                ? "bg-green-600 hover:bg-green-700" 
                : "border-slate-600 text-slate-300 hover:bg-slate-800"
              }
            >
              <option.icon className="h-4 w-4 mr-1" />
              {option.name}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search posts..."
              className="pl-10 bg-slate-800 border-slate-600 text-white w-64"
            />
          </div>
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <span className="text-slate-300">{category.name}</span>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                      {category.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Community Stats */}
          <Card className="bg-slate-900 border-slate-700 mt-4">
            <CardHeader>
              <CardTitle className="text-white text-lg">Community Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Active Members</span>
                <span className="text-white font-medium">12,547</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Posts Today</span>
                <span className="text-white font-medium">89</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Online Now</span>
                <span className="text-green-400 font-medium">1,234</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {showNewPost && (
            <Card className="bg-slate-900 border-slate-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Create New Post</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Post title..."
                  className="bg-slate-800 border-slate-600 text-white"
                />
                <Textarea
                  placeholder="What's on your mind? Share your investment thoughts, analysis, or questions..."
                  className="bg-slate-800 border-slate-600 text-white min-h-[120px]"
                />
                <div className="flex items-center justify-between">
                  <Input
                    placeholder="Add tags (e.g., AAPL, Options, Analysis)"
                    className="bg-slate-800 border-slate-600 text-white max-w-xs"
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewPost(false)}
                      className="border-slate-600 text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700">
                      Post
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts */}
          <div className="space-y-4">
            {mockPosts.map((post) => (
              <Card key={post.id} className="bg-slate-900 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Voting */}
                    <div className="flex flex-col items-center space-y-1">
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-green-400 p-1">
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium text-white">
                        {post.upvotes - post.downvotes}
                      </span>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-400 p-1">
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          {post.category}
                        </Badge>
                        <span className="text-slate-400 text-sm">•</span>
                        <span className="text-slate-400 text-sm">Posted by</span>
                        <span className="text-slate-300 text-sm font-medium">{post.author}</span>
                        <span className="text-slate-400 text-sm">•</span>
                        <span className="text-slate-400 text-sm">{post.timestamp}</span>
                      </div>

                      <h3 className="text-white font-semibold text-lg mb-2 hover:text-green-400 cursor-pointer">
                        {post.title}
                      </h3>

                      <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                        {post.content}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
                          {post.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {post.comments} comments
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityForum;
